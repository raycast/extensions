import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, createElement } from "react";
import { mockRaycastUi, shownToasts } from "./raycastUiMock";

const transportGlobals = {
  Response,
  Request,
  Headers,
  ReadableStream,
  WritableStream,
  TransformStream,
};
GlobalRegistrator.register();
Object.assign(globalThis, transportGlobals);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const originalFetch = globalThis.fetch;
mockRaycastUi();
const { CardDetail } = await import("../components/CardDetail");

const card = {
  aiSummary: null,
  aiTags: [],
  appUrl: null,
  content: "A note worth keeping",
  createdAt: 1_739_250_000_000,
  fileUrl: null,
  id: "k17abcdefghij1234567890abcdefghij",
  isArchived: false,
  isFavorited: false,
  linkPreviewImageUrl: null,
  metadataDescription: null,
  metadataTitle: "A note worth keeping",
  notes: null,
  screenshotUrl: null,
  tags: [],
  thumbnailUrl: null,
  type: "text",
  updatedAt: 1_739_250_000_000,
  url: null,
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let calls: string[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  calls = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method !== "GET") {
      calls.push(`${method} ${new URL(String(input)).pathname}`);
    }
    if (method === "DELETE") {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(
      Response.json({ ...card, isFavorited: method !== "GET" }),
    );
  }) as typeof fetch;
});
afterEach(async () => {
  await act(() => {
    root.unmount();
    return Promise.resolve();
  });
  container.remove();
  globalThis.fetch = originalFetch;
});
afterAll(() => GlobalRegistrator.unregister());

const press = async (title: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === title,
  );
  expect(button, `an action named "${title}"`).toBeDefined();
  await act(async () => button?.click());
};

test("a favorite still waiting is sent before the card moves to Trash", async () => {
  const events: string[] = [];
  await act(() => {
    root.render(
      createElement(CardDetail, {
        card,
        onCardDeleted: () => events.push("removed"),
        onCardUpdated: (next) =>
          events.push(next.isFavorited ? "favorited" : "unfavorited"),
        onNavigateBackAfterDelete: () => undefined,
      }),
    );
    return Promise.resolve();
  });
  // Both inside the 300 ms the detail waits before saving a favorite.
  await press("Favorite");
  await press("Move to Trash");
  await act(async () => new Promise((resolve) => setTimeout(resolve, 400)));

  expect(calls).toHaveLength(2);
  expect(calls[0]).toContain("/favorite");
  expect(calls[1]).toStartWith("DELETE");
  // Nothing puts the card back in the list after it left for Trash.
  expect(events.at(-1)).toBe("removed");
  expect(shownToasts.at(-1)?.title).toBe("Moved to Trash");
});
