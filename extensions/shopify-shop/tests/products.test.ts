import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { fetchAllProducts } from "../src/services/products.ts";

const productsUrl = "https://store.example/products.json?currency=CAD";
const product = (id: number) => ({ id, handle: `product-${id}`, title: `Product ${id}` });
const jsonResponse = (products: unknown[]) => Response.json({ products });

afterEach(() => mock.restoreAll());

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
