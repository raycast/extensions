import test from "node:test";
import assert from "node:assert/strict";
import { fetchText } from "../src/lib/fetch";

const URL_UNDER_TEST = "https://example.com/page";

type Stub = {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  throws?: Error;
};

function stubFetch(stub: Stub) {
  const original = globalThis.fetch;

  globalThis.fetch = (async () => {
    if (stub.throws) throw stub.throws;
    return {
      ok: (stub.status ?? 200) < 400,
      status: stub.status ?? 200,
      statusText: stub.statusText ?? "OK",
      headers: new Headers(stub.headers ?? { "content-type": "text/html" }),
      text: async () => stub.body ?? "",
    };
  }) as unknown as typeof globalThis.fetch;

  return () => {
    globalThis.fetch = original;
  };
}

async function withStub(stub: Stub, fn: () => Promise<void>) {
  const restore = stubFetch(stub);
  try {
    await fn();
  } finally {
    restore();
  }
}

test("fetchText returns the body for a markup response", async () => {
  await withStub({ body: "<html>hi</html>" }, async () => {
    assert.equal(await fetchText(URL_UNDER_TEST), "<html>hi</html>");
  });
});

test("fetchText accepts the plain text a reader service returns", async () => {
  await withStub({ body: "# Markdown", headers: { "content-type": "text/plain" } }, async () => {
    assert.equal(await fetchText(URL_UNDER_TEST), "# Markdown");
  });
});

test("fetchText reports the status for a failed request", async () => {
  await withStub({ status: 403, statusText: "Forbidden" }, async () => {
    await assert.rejects(fetchText(URL_UNDER_TEST), /403 Forbidden/);
  });
});

test("fetchText refuses content that isn't a webpage", async () => {
  await withStub({ body: "%PDF-1.7", headers: { "content-type": "application/pdf" } }, async () => {
    await assert.rejects(fetchText(URL_UNDER_TEST), /application\/pdf/);
  });
});

test("fetchText refuses an oversized declared payload", async () => {
  await withStub(
    {
      headers: { "content-type": "text/html", "content-length": "99000000" },
    },
    async () => {
      await assert.rejects(fetchText(URL_UNDER_TEST), /too large \(99 MB\)/);
    },
  );
});

test("fetchText refuses an oversized body when content-length is absent", async () => {
  await withStub({ body: "x".repeat(20_000_001) }, async () => {
    await assert.rejects(fetchText(URL_UNDER_TEST), /too large/);
  });
});

test("fetchText stops reading an oversized stream instead of buffering it", async () => {
  const chunk = new Uint8Array(1_000_000); // 1 MB per pull
  let pulls = 0;
  let cancelled = false;

  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/html" }),
    // No content-length, so only the streaming guard can stop this.
    body: {
      getReader: () => ({
        read: async () => {
          pulls += 1;
          return { done: false, value: chunk };
        },
        cancel: async () => {
          cancelled = true;
        },
      }),
    },
  })) as unknown as typeof globalThis.fetch;

  try {
    await assert.rejects(fetchText(URL_UNDER_TEST), /too large/);
    // 20 MB ceiling at 1 MB a pull: it must bail out rather than read forever.
    assert.ok(pulls <= 21, `read ${pulls} chunks before stopping`);
    assert.ok(cancelled, "the stream should be cancelled when bailing out");
  } finally {
    globalThis.fetch = original;
  }
});

test("fetchText turns a timeout into a readable message", async () => {
  const timeout = new Error("The operation was aborted due to timeout");
  timeout.name = "TimeoutError";

  await withStub({ throws: timeout }, async () => {
    await assert.rejects(fetchText(URL_UNDER_TEST), /timed out after 20s/);
  });
});
