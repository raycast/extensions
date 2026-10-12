import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { fetchProducts } from "../src/services/products.ts";

async function fetchAllProducts(...args: Parameters<typeof fetchProducts>) {
  const catalog = await fetchProducts(...args);
  assert.equal(catalog.paginationLimited, false);
  return catalog.products;
}

const productsUrl = "https://store.example/products.json?currency=CAD";
const product = (id: number) => ({ id, handle: `product-${id}`, title: `Product ${id}` });
const jsonResponse = (products: unknown[]) => Response.json({ products });

afterEach(() => mock.restoreAll());

test("a storefront returning fresh IDs forever stops at a finite request budget", async () => {
  let requests = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++requests > 101) throw new Error("Exceeded the finite request budget");
    return jsonResponse([product(requests)]);
  });
  const catalog = await fetchProducts(productsUrl);
  assert.equal(catalog.paginationLimited, true);
  assert.equal(catalog.products.length, 101);
  assert.equal(requests, 101);
});

test("Shopify's ceiling preserves the loaded catalog and explicitly marks it incomplete", async () => {
  const requests: number[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    const page = Number(new URL(input).searchParams.get("page"));
    requests.push(page);
    if (page === 101) return Response.json({ errors: "Page * Limit exceeds the 25000 limit." }, { status: 400 });
    return jsonResponse(Array.from({ length: 250 }, (_, index) => product((page - 1) * 250 + index + 1)));
  });

  const catalog = await fetchProducts(productsUrl);
  assert.equal(catalog.paginationLimited, true);
  assert.equal(catalog.products.length, 25000);
  assert.equal(catalog.products.at(-1)?.id, 25000);
  assert.equal(requests.length, 101);
});

test("a catalog ending before the ceiling completes without a limit warning", async () => {
  mock.method(globalThis, "fetch", async (input: string) => {
    const page = Number(new URL(input).searchParams.get("page"));
    if (page === 100) return jsonResponse([]);
    return jsonResponse([product(page)]);
  });
  const catalog = await fetchProducts(productsUrl);
  assert.equal(catalog.paginationLimited, false);
  assert.equal(catalog.products.length, 99);
});

test("other HTTP 400 responses beyond the ceiling remain failures", async () => {
  mock.method(globalThis, "fetch", async (input: string) => {
    const page = Number(new URL(input).searchParams.get("page"));
    return page === 101 ? Response.json({ errors: "Bad request" }, { status: 400 }) : jsonResponse([product(page)]);
  });
  await assert.rejects(fetchProducts(productsUrl), /Failed to load products \(400\)/);
});

test("the ceiling message before the boundary remains a failure", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({ errors: "Page * Limit exceeds the 25000 limit." }, { status: 400 }),
  );
  await assert.rejects(fetchProducts(productsUrl), /Failed to load products \(400\)/);
});

test("loads every page, including short pages, and stops at the empty page", async () => {
  const pages = [[product(1), product(2)], [product(3)], [product(4)], []];
  const requests: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    return jsonResponse(pages[Number(url.searchParams.get("page")) - 1]);
  });

  assert.deepEqual(await fetchAllProducts(productsUrl), pages.slice(0, -1).flat());
  assert.deepEqual(
    requests.map((url) => url.searchParams.get("page")),
    ["1", "2", "3", "4"],
  );
  assert.ok(requests.every((url) => url.searchParams.get("currency") === "CAD"));
  assert.ok(requests.every((url) => url.searchParams.get("limit") === "250"));
});

test("loads catalogs beyond one full requested page", async () => {
  const fullPage = Array.from({ length: 250 }, (_, index) => product(index + 1));
  const pages = [fullPage, [product(251)], []];
  const fetchMock = mock.method(globalThis, "fetch", async (input: string) =>
    jsonResponse(pages[Number(new URL(input).searchParams.get("page")) - 1]),
  );

  const result = await fetchAllProducts(productsUrl);
  assert.equal(result.length, 251);
  assert.equal(result.at(-1)?.id, 251);
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("an empty catalog completes after one request", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([]));
  assert.deepEqual(await fetchAllProducts(productsUrl), []);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("collection requests retain their path and currency on every page", async () => {
  const requests: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(new URL(input));
    return jsonResponse(requests.length === 1 ? [product(8)] : []);
  });
  await fetchAllProducts("https://store.example/collections/sale/products.json?currency=EUR&page=9&limit=1");
  assert.ok(requests.every((url) => url.pathname === "/collections/sale/products.json"));
  assert.ok(requests.every((url) => url.searchParams.get("currency") === "EUR"));
  assert.deepEqual(
    requests.map((url) => url.searchParams.get("page")),
    ["1", "2"],
  );
});

test("overlapping pages return each product once in storefront order", async () => {
  const pages = [[product(2), product(1)], [product(1), product(3)], []];
  let page = 0;
  mock.method(globalThis, "fetch", async () => jsonResponse(pages[page++]));
  assert.deepEqual(await fetchAllProducts(productsUrl), [product(2), product(1), product(3)]);
});

test("a storefront ignoring pagination fails instead of looping or silently truncating", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([product(1)]));
  await assert.rejects(fetchAllProducts(productsUrl), /repeated products page/);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("HTTP errors on later pages reject the whole load", async () => {
  let page = 0;
  mock.method(globalThis, "fetch", async () =>
    ++page === 1 ? jsonResponse([product(1)]) : new Response("Unavailable", { status: 503 }),
  );
  await assert.rejects(fetchAllProducts(productsUrl), /Failed to load products \(503\)/);
  assert.equal(page, 2);
});

test("network errors on later pages reject the whole load", async () => {
  let page = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++page === 1) return jsonResponse([product(1)]);
    throw new Error("Network unavailable");
  });
  await assert.rejects(fetchAllProducts(productsUrl), /Network unavailable/);
});

for (const body of ["not json", "null", "{}", '{"products":{}}', '{"products":[null]}', '{"products":[{}]}']) {
  test(`rejects malformed page: ${body}`, async () => {
    let page = 0;
    mock.method(globalThis, "fetch", async () => (++page === 1 ? jsonResponse([product(1)]) : new Response(body)));
    await assert.rejects(fetchAllProducts(productsUrl), /invalid products response/);
  });
}

test("a pre-aborted load sends no requests", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => jsonResponse([]));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchAllProducts(productsUrl, controller.signal), { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("cancellation during JSON parsing stops before requesting the next page", async () => {
  const controller = new AbortController();
  const fetchMock = mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => {
    assert.equal(init.signal, controller.signal);
    return {
      ok: true,
      json: async () => {
        controller.abort();
        return { products: [product(1)] };
      },
    };
  });
  await assert.rejects(fetchAllProducts(productsUrl, controller.signal), { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("switching collection aborts the old request; restarting begins at page one with fresh state", async () => {
  const controller = new AbortController();
  const requests: string[] = [];
  let notifyPending: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    notifyPending = resolve;
  });
  let interrupt = true;
  mock.method(globalThis, "fetch", async (input: string, init: RequestInit) => {
    const url = new URL(input);
    requests.push(`${url.pathname}:${url.searchParams.get("page")}`);
    if (interrupt && url.searchParams.get("page") === "2") {
      notifyPending();
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      });
    }
    return jsonResponse(url.searchParams.get("page") === "1" ? [product(1)] : []);
  });

  const oldLoad = fetchAllProducts(productsUrl, controller.signal);
  await pending;
  controller.abort();
  await assert.rejects(oldLoad, { name: "AbortError" });
  interrupt = false;
  assert.deepEqual(await fetchAllProducts("https://store.example/collections/sale/products.json"), [product(1)]);
  assert.deepEqual(await fetchAllProducts(productsUrl), [product(1)]);
  assert.deepEqual(requests, [
    "/products.json:1",
    "/products.json:2",
    "/collections/sale/products.json:1",
    "/collections/sale/products.json:2",
    "/products.json:1",
    "/products.json:2",
  ]);
});

test("retrying after a later-page failure starts over without leaking partial products", async () => {
  let fail = true;
  const pages: string[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    const page = new URL(input).searchParams.get("page")!;
    pages.push(page);
    if (page === "1") return jsonResponse([product(fail ? 1 : 2)]);
    if (fail) throw new Error("Temporary failure");
    return jsonResponse([]);
  });
  await assert.rejects(fetchAllProducts(productsUrl), /Temporary failure/);
  fail = false;
  assert.deepEqual(await fetchAllProducts(productsUrl), [product(2)]);
  assert.deepEqual(pages, ["1", "2", "1", "2"]);
});
