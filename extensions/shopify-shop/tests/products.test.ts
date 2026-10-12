import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { fetchProductsPage, type ProductPageCursor } from "../src/services/products.ts";

const productsUrl = "https://store.example/products.json?currency=CAD";
const product = (id: number) => ({ id, handle: `product-${id}`, title: `Product ${id}` });
const jsonResponse = (products: unknown[]) => Response.json({ products });
afterEach(() => mock.restoreAll());

async function loadPages(url = productsUrl) {
  const data = [];
  let cursor: ProductPageCursor | undefined;
  for (let page = 0; ; page++) {
    const result = await fetchProductsPage(url, { page, cursor });
    data.push(...result.data);
    cursor = result.cursor;
    if (!result.hasMore) return { data, cursor };
  }
}

test("a single call returns the first page without downloading the next page", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([product(1)]));
  const result = await fetchProductsPage(productsUrl, { page: 0 });
  assert.deepEqual(result.data, [product(1)]);
  assert.equal(result.hasMore, true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("numbered pages include short pages and finish on an empty page", async () => {
  const pages = [[product(1), product(2)], [product(3)], [product(4)], []];
  const requests: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    return jsonResponse(pages[Number(url.searchParams.get("page")) - 1]);
  });
  const result = await loadPages();
  assert.deepEqual(result.data, pages.slice(0, -1).flat());
  assert.equal(result.cursor.notice, undefined);
  assert.deepEqual(
    requests.map((url) => url.searchParams.get("page")),
    ["1", "2", "3", "4"],
  );
  assert.ok(requests.every((url) => url.searchParams.get("currency") === "CAD"));
  assert.ok(requests.every((url) => url.searchParams.get("limit") === "250"));
});

test("an empty first page completes after one request", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([]));
  const result = await fetchProductsPage(productsUrl, { page: 0 });
  assert.deepEqual(result.data, []);
  assert.equal(result.hasMore, false);
  assert.equal(result.cursor.notice, undefined);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("collection requests retain their path and currency on every page", async () => {
  const requests: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(new URL(input));
    return jsonResponse(requests.length === 1 ? [product(8)] : []);
  });
  await loadPages("https://store.example/collections/sale/products.json?currency=EUR&page=9&limit=1");
  assert.ok(requests.every((url) => url.pathname === "/collections/sale/products.json"));
  assert.ok(requests.every((url) => url.searchParams.get("currency") === "EUR"));
  assert.deepEqual(
    requests.map((url) => url.searchParams.get("page")),
    ["1", "2"],
  );
});

test("overlap and duplicate IDs are removed in storefront order without mutating the old cursor", async () => {
  const pages = [[product(2), product(1), product(1)], [product(1), product(3)], []];
  let page = 0;
  mock.method(globalThis, "fetch", async () => jsonResponse(pages[page++]));
  const first = await fetchProductsPage(productsUrl, { page: 0 });
  const second = await fetchProductsPage(productsUrl, { page: 1, cursor: first.cursor });
  assert.deepEqual(first.data, [product(2), product(1)]);
  assert.deepEqual(second.data, [product(3)]);
  assert.deepEqual(first.cursor.seenIds, [2, 1]);
  assert.deepEqual(second.cursor.seenIds, [2, 1, 3]);
});

test("a repeated page stops with an explicit partial-load notice", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([product(1)]));
  const result = await loadPages();
  assert.deepEqual(result.data, [product(1)]);
  assert.match(result.cursor.notice!.message, /repeated products page/);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("a storefront returning fresh IDs forever stops at 101 requests with an incomplete notice", async () => {
  let requests = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++requests > 101) throw new Error("Exceeded the request budget");
    return jsonResponse([product(requests)]);
  });
  const result = await loadPages();
  assert.equal(result.data.length, 101);
  assert.equal(requests, 101);
  assert.match(result.cursor.notice!.message, /may be incomplete/);
});

test("Shopify's ceiling retains 25000 loaded products and stops with a warning", async () => {
  mock.method(globalThis, "fetch", async (input: string) => {
    const page = Number(new URL(input).searchParams.get("page"));
    if (page === 101) return Response.json({ errors: "Page * Limit exceeds the 25000 limit." }, { status: 400 });
    return jsonResponse(Array.from({ length: 250 }, (_, index) => product((page - 1) * 250 + index + 1)));
  });
  const result = await loadPages();
  assert.equal(result.data.length, 25000);
  assert.equal(result.cursor.notice!.title, "Pagination Limit Reached");
});

test("requests beyond the budget do not fetch another page", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([]));
  const result = await fetchProductsPage(productsUrl, { page: 101, cursor: { url: productsUrl, seenIds: [1] } });
  assert.equal(result.hasMore, false);
  assert.match(result.cursor.notice!.message, /incomplete/);
  assert.equal(fetchMock.mock.callCount(), 0);
});

for (const status of [400, 503]) {
  test(`first-page HTTP ${status} remains an error`, async () => {
    mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status }));
    await assert.rejects(
      fetchProductsPage(productsUrl, { page: 0 }),
      new RegExp(`Failed to load products \\(${status}\\)`),
    );
  });
  test(`later-page HTTP ${status} stops and reports failure without dropping earlier products`, async () => {
    let page = 0;
    mock.method(globalThis, "fetch", async () =>
      ++page === 1 ? jsonResponse([product(1)]) : new Response("Unavailable", { status }),
    );
    const result = await loadPages();
    assert.deepEqual(result.data, [product(1)]);
    assert.match(result.cursor.notice!.message, new RegExp(`Failed to load products \\(${status}\\)`));
  });
}

test("network errors on later pages produce a partial-load notice", async () => {
  let page = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++page === 1) return jsonResponse([product(1)]);
    throw new Error("Network unavailable");
  });
  const result = await loadPages();
  assert.deepEqual(result.data, [product(1)]);
  assert.match(result.cursor.notice!.message, /Network unavailable/);
});

for (const body of [
  "not json",
  "null",
  "{}",
  '{"products":{}}',
  '{"products":[null]}',
  '{"products":[{}]}',
  '{"products":[{"id":2},null]}',
]) {
  test(`malformed first and subsequent pages are reported: ${body}`, async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => new Response(body));
    await assert.rejects(fetchProductsPage(productsUrl, { page: 0 }), /invalid products response/);
    const cursor = { url: productsUrl, seenIds: [1] };
    const result = await fetchProductsPage(productsUrl, { page: 1, cursor });
    assert.deepEqual(result.data, []);
    assert.equal(result.hasMore, false);
    assert.match(result.cursor.notice!.message, /invalid products response/);
    assert.deepEqual(result.cursor.seenIds, [1]);
    assert.deepEqual(cursor.seenIds, [1]);
    assert.equal(fetchMock.mock.callCount(), 2);
  });
}

test("a pre-aborted page sends no request", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([]));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchProductsPage(productsUrl, { page: 0 }, controller.signal), { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("a response arriving after cancellation is not parsed", async () => {
  const controller = new AbortController();
  let parsed = false;
  mock.method(globalThis, "fetch", async () => {
    controller.abort();
    return {
      ok: true,
      json: async () => {
        parsed = true;
        return { products: [product(1)] };
      },
    };
  });
  await assert.rejects(fetchProductsPage(productsUrl, { page: 0 }, controller.signal), { name: "AbortError" });
  assert.equal(parsed, false);
});

test("cancellation during parsing rejects instead of returning a partial-load notice or changing the cursor", async () => {
  const controller = new AbortController();
  const cursor = { url: productsUrl, seenIds: [1] };
  mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => {
    assert.equal(init.signal, controller.signal);
    return {
      ok: true,
      json: async () => {
        controller.abort();
        return { products: [product(2)] };
      },
    };
  });
  await assert.rejects(fetchProductsPage(productsUrl, { page: 1, cursor }, controller.signal), { name: "AbortError" });
  assert.deepEqual(cursor.seenIds, [1]);
});

test("restarting at page zero discards earlier IDs, failures and scope", async () => {
  mock.method(globalThis, "fetch", async () => jsonResponse([product(1)]));
  const old = { url: productsUrl, seenIds: [1], notice: { title: "Failure", message: "Old failure" } };
  const result = await fetchProductsPage("https://other.example/collections/sale/products.json", {
    page: 0,
    cursor: old,
  });
  assert.deepEqual(result.data, [product(1)]);
  assert.equal(result.cursor.notice, undefined);
  assert.match(result.cursor.url, /other.example/);
});

test("a cursor from another scope cannot request page two of a new store", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([]));
  const result = await fetchProductsPage("https://other.example/products.json", {
    page: 1,
    cursor: { url: productsUrl, seenIds: [1] },
  });
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(result.hasMore, false);
  assert.match(result.cursor.notice!.message, /pagination changed/);
  assert.deepEqual(result.cursor.seenIds, []);
});
