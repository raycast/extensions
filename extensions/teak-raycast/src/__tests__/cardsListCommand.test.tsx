import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, createElement } from "react";
import { mockRaycastUi } from "./raycastUiMock";

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
const { default: SearchCardsCommand } = await import("../search-cards");

const linkCard = {
  aiSummary: null,
  aiTags: [],
  appUrl: null,
  completedAt: null,
  content: "https://example.com/post",
  createdAt: 1_739_250_000_000,
  fileUrl: null,
  id: "k17abcdefghij1234567890abcdefghij",
  isArchived: false,
  isFavorited: false,
  linkCategory: "article",
  linkPreviewImageUrl: null,
  metadataDescription: null,
  metadataTitle: "A long read",
  notes: null,
  screenshotUrl: null,
  tags: [],
  thumbnailUrl: null,
  type: "link",
  updatedAt: 1_739_250_000_000,
  url: "https://example.com/post",
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let requests: URL[];

const serve = (answer: (url: URL) => unknown[]) => {
  requests = [];
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requests.push(url);
    return Promise.resolve(
      Response.json({
        items: answer(url),
        pageInfo: { hasMore: false, nextCursor: null },
      }),
    );
  }) as typeof fetch;
};
const render = async () => {
  await act(async () => root.render(createElement(SearchCardsCommand)));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
};
const press = async (title: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === title,
  );
  expect(button, `an action named "${title}"`).toBeDefined();
  await act(async () => button?.click());
  await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
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

test("a link row offers archive, done, similar, folder and refresh actions", async () => {
  serve(() => [linkCard]);
  await render();
  const text = container.textContent ?? "";
  for (const title of [
    "A long read",
    "Archive Card",
    "Mark as Read",
    "Find Similar",
    "Add to Folder…",
    "Refresh Details",
    "Show Archive",
    "Shuffle",
  ]) {
    expect(text).toContain(title);
  }
  // A smart folder needs a search to save, and nothing has been typed.
  expect(text).not.toContain("Save Search as Smart Folder…");
});

test("a done, archived link shows its marks and offers the undoing actions", async () => {
  serve(() => [
    { ...linkCard, completedAt: 1_739_250_000_001, isArchived: true },
  ]);
  await render();
  const text = container.textContent ?? "";
  expect(text).toContain("Mark as Not Read");
  expect(text).toContain("Unarchive");
  expect(text).toContain("Archived");
});

test("a text card has no done action", async () => {
  serve(() => [{ ...linkCard, linkCategory: null, type: "text" }]);
  await render();
  expect(container.textContent).not.toContain("Mark as");
  expect(container.textContent).toContain("Archive Card");
});

test("Shuffle asks the API for a shuffled page with a seed", async () => {
  serve(() => [linkCard]);
  await render();
  await press("Shuffle");
  const shuffled = requests.at(-1);
  expect(shuffled?.searchParams.get("sort")).toBe("shuffle");
  expect(
    Number(shuffled?.searchParams.get("shuffleSeed")),
  ).toBeGreaterThanOrEqual(0);
  const firstSeed = shuffled?.searchParams.get("shuffleSeed");
  await press("Shuffle");
  expect(requests.at(-1)?.searchParams.get("shuffleSeed")).not.toBe(firstSeed);
});

test("Show Archive lists archived cards only", async () => {
  serve(() => [linkCard]);
  await render();
  await press("Show Archive");
  expect(requests.at(-1)?.searchParams.get("archived")).toBe("only");
  expect(container.textContent).toContain("Leave Archive");
});

test("an empty library says when hidden cards may be why", async () => {
  serve((url) => (url.searchParams.get("tag") === "secret" ? [linkCard] : []));
  await render();
  expect(container.textContent).toContain(
    "Some cards are hidden. Search #secret or #hidden to see them.",
  );
});

test("an empty library with nothing hidden keeps the plain message", async () => {
  serve(() => []);
  await render();
  expect(container.textContent).toContain("No cards found");
  expect(container.textContent).not.toContain("Some cards are hidden");
});
