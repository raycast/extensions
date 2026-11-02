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
const { default: RandomCardsCommand } = await import("../random-cards");

const card = (id: string, title: string) => ({
  aiSummary: null,
  aiTags: [],
  appUrl: null,
  content: title,
  createdAt: 1_739_250_000_000,
  fileUrl: null,
  id,
  isArchived: false,
  isFavorited: false,
  linkPreviewImageUrl: null,
  metadataDescription: null,
  metadataTitle: title,
  notes: null,
  screenshotUrl: null,
  tags: [],
  thumbnailUrl: null,
  type: "text",
  updatedAt: 1_739_250_000_000,
  url: null,
});

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let requests: Array<{ method: string; url: URL; body: unknown }>;

const serve = (cards: ReturnType<typeof card>[]) => {
  requests = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : null,
      method: init?.method ?? "GET",
      url,
    });
    if (init?.method === "PATCH") {
      return Promise.resolve(Response.json({ ...cards[0], isArchived: true }));
    }
    return Promise.resolve(
      Response.json({
        items: cards,
        pageInfo: { hasMore: false, nextCursor: null },
      }),
    );
  }) as typeof fetch;
};
const settle = () =>
  act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
const press = async (title: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === title,
  );
  expect(button, `an action named "${title}"`).toBeDefined();
  await act(async () => button?.click());
  await settle();
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  globalThis.fetch = originalFetch;
});
afterAll(() => GlobalRegistrator.unregister());

const idA = "k17aaaaaaaaaaa1234567890aaaaaaaaaa";
const idB = "k17bbbbbbbbbbb1234567890bbbbbbbbbb";

test("asks for 20 shuffled cards with a seed", async () => {
  serve([card(idA, "First card")]);
  await act(async () => root.render(createElement(RandomCardsCommand)));
  await settle();
  const list = requests[0]?.url.searchParams;
  expect(list?.get("sort")).toBe("shuffle");
  expect(list?.get("limit")).toBe("20");
  expect(list?.get("shuffleSeed")).not.toBeNull();
  expect(container.textContent).toContain("First card");
});

test("Keep moves on without changing the card", async () => {
  serve([card(idA, "First card")]);
  await act(async () => root.render(createElement(RandomCardsCommand)));
  await settle();
  await press("Keep");
  expect(container.textContent).not.toContain("First card");
  expect(container.textContent).toContain("Nothing left to revisit");
  expect(requests.filter((request) => request.method !== "GET")).toEqual([]);
});

test("Archive archives it and drops it from the deck", async () => {
  serve([card(idA, "First card"), card(idB, "Second card")]);
  await act(async () => root.render(createElement(RandomCardsCommand)));
  await settle();
  await press("Archive");
  const patch = requests.find((request) => request.method === "PATCH");
  expect(patch?.body).toEqual({ isArchived: true });
  expect(patch?.url.pathname).toBe(`/api/v1/cards/${idA}`);
  expect(container.textContent).not.toContain("First card");
});

test("Undo after Archive deals the card back", async () => {
  serve([card(idA, "First card"), card(idB, "Second card")]);
  const answer = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const { isArchived } = JSON.parse(String(init.body));
      return Promise.resolve(
        Response.json({ ...card(idA, "First card"), isArchived }),
      );
    }
    return answer(input, init);
  }) as typeof fetch;
  await act(async () => root.render(createElement(RandomCardsCommand)));
  await settle();
  await press("Archive");
  expect(container.textContent).not.toContain("First card");

  const archived = shownToasts.at(-1);
  const undo = archived?.primaryAction as
    | { onAction: (toast: unknown) => Promise<void> }
    | undefined;
  await act(async () => undo?.onAction(archived));
  await settle();
  expect(container.textContent).toContain("First card");
});

test("Shuffle Again deals a new set with a new seed", async () => {
  serve([card(idA, "First card")]);
  await act(async () => root.render(createElement(RandomCardsCommand)));
  await settle();
  const firstSeed = requests[0]?.url.searchParams.get("shuffleSeed");
  await press("Shuffle Again");
  const secondSeed = requests.at(-1)?.url.searchParams.get("shuffleSeed");
  expect(requests).toHaveLength(2);
  expect(secondSeed).not.toBe(firstSeed);
});

test("an empty vault isn't a finished shuffle", async () => {
  serve([]);
  await act(async () => root.render(createElement(RandomCardsCommand)));
  await settle();
  expect(container.textContent).toContain("No cards to shuffle yet");
  expect(container.textContent).not.toContain("Nothing left to revisit");
});
