import assert from "node:assert/strict";
import { test } from "node:test";

import { createRealtimeBoardSeek, LichessApiError } from "../src/api/lichess";

test("createRealtimeBoardSeek reports a canceled seek when waiting for a match times out", async () => {
  const originalFetch = globalThis.fetch;
  let eventSignalAborted = false;
  let seekSignalAborted = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);

    if (url.includes("/account/playing")) {
      return Response.json({ nowPlaying: [] });
    }

    if (url.endsWith("/stream/event")) {
      let streamController: ReadableStreamDefaultController<Uint8Array>;
      init?.signal?.addEventListener("abort", () => {
        eventSignalAborted = true;
        streamController.error(new Error("Event stream aborted"));
      });

      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            streamController = controller;
          },
        }),
        { status: 200 },
      );
    }

    if (url.endsWith("/board/seek")) {
      let streamController: ReadableStreamDefaultController<Uint8Array>;
      init?.signal?.addEventListener("abort", () => {
        seekSignalAborted = true;
        streamController.error(new Error("Seek aborted"));
      });

      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            streamController = controller;
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

    assert.equal(eventSignalAborted, true);
    assert.equal(seekSignalAborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createRealtimeBoardSeek resolves the game created by the seek", async () => {
  const originalFetch = globalThis.fetch;
  let accountPlayingRequests = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes("/account/playing")) {
      accountPlayingRequests += 1;

      return Response.json({
        nowPlaying:
          accountPlayingRequests === 1
            ? [{ gameId: "existing", rated: true, secondsLeft: 600, source: "lobby", variant: { key: "standard" } }]
            : [
                { gameId: "existing", rated: true, secondsLeft: 600, source: "lobby", variant: { key: "standard" } },
                {
                  gameId: "unrelated",
                  color: "white",
                  rated: false,
                  secondsLeft: 600,
                  source: "friend",
                  variant: { key: "standard" },
                },
                {
                  gameId: "matched",
                  color: "white",
                  rated: true,
                  secondsLeft: 600,
                  source: "lobby",
                  variant: { key: "standard" },
                },
              ],
      });
    }

    if (url.endsWith("/stream/event")) {
      const events = [
        {
          type: "gameStart",
          game: { gameId: "existing", rated: true, secondsLeft: 600, source: "lobby", variant: { key: "standard" } },
        },
        {
          type: "gameStart",
          game: {
            gameId: "unrelated",
            color: "white",
            rated: false,
            secondsLeft: 600,
            source: "friend",
            variant: { key: "standard" },
          },
        },
        {
          type: "gameStart",
          game: {
            gameId: "matched",
            color: "white",
            rated: true,
            secondsLeft: 600,
            source: "lobby",
            variant: { key: "standard" },
          },
        },
      ];

      return new Response(events.map((event) => JSON.stringify(event)).join("\n"), { status: 200 });
    }

    if (url.endsWith("/board/seek")) {
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close();
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const gameId = await createRealtimeBoardSeek({
      token: "token",
      time: 10,
      increment: 0,
      rated: true,
      color: "white",
      variant: "standard",
    });

    assert.equal(gameId, "matched");
    assert.equal(accountPlayingRequests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createRealtimeBoardSeek rejects when the seek closes without a matching game", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes("/account/playing")) {
      return Response.json({ nowPlaying: [] });
    }

    if (url.endsWith("/stream/event")) {
      return new Response("", { status: 200 });
    }

    if (url.endsWith("/board/seek")) {
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.close();
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    await assert.rejects(
      createRealtimeBoardSeek({
        token: "token",
        time: 10,
        increment: 0,
        rated: true,
        color: "white",
        variant: "standard",
      }),
      (error) =>
        error instanceof LichessApiError &&
        error.message === "The Lichess seek ended before a matching game could be found.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
