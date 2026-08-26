import assert from "node:assert/strict";
import { test } from "node:test";

import { createRealtimeBoardSeek, LichessApiError } from "../src/api/lichess";

test("createRealtimeBoardSeek reports a canceled seek when waiting for a match times out", async () => {
  const originalFetch = globalThis.fetch;
  let seekSignalAborted = false;
  let seekBodyCanceled = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);

    if (url.endsWith("/stream/event")) {
      return new Response(new ReadableStream<Uint8Array>({}), { status: 200 });
    }

    if (url.endsWith("/board/seek")) {
      init?.signal?.addEventListener("abort", () => {
        seekSignalAborted = true;
      });

      return new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            seekBodyCanceled = true;
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    await assert.rejects(
      createRealtimeBoardSeek(
        {
          token: "token",
          time: 10,
          increment: 0,
          rated: true,
          color: "random",
          variant: "standard",
        },
        1,
      ),
      (error) =>
        error instanceof LichessApiError &&
        error.message === "No opponent joined before the seek wait timed out. The Lichess seek was canceled.",
    );

    assert.equal(seekSignalAborted, true);
    assert.equal(seekBodyCanceled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
