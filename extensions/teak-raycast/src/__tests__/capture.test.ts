import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

interface ToastState {
  message?: string;
  primaryAction?: { title: string };
  style?: string;
  title?: string;
}

const toasts: ToastState[] = [];
let tabs: Array<{ active: boolean; title?: string; url: string }> = [];

mock.module("@raycast/api", () => ({
  ...createRaycastApiMock(false, {
    getPreferenceValues: () => ({ apiKey: "valid-test-key" }),
  }),
  BrowserExtension: { getTabs: () => Promise.resolve(tabs) },
  environment: { canAccess: () => true, isDevelopment: false },
  open: () => Promise.resolve(),
  showToast: (options: ToastState) => {
    const toast = { ...options };
    toasts.push(toast);
    return Promise.resolve(toast);
  },
  Toast: {
    Style: { Animated: "animated", Failure: "failure", Success: "success" },
  },
}));

const { default: saveCurrentBrowserTab } =
  await import("../save-current-browser-tab");
const { saveCardWithFeedback } = await import("../lib/capture");

const card = {
  appUrl: "https://app.teakvault.com/?card=card_1",
  id: "card_1",
  type: "link",
  content: "https://example.com/post",
  notes: null,
  url: "https://example.com/post",
  tags: [],
  aiTags: [],
  aiSummary: null,
  isFavorited: false,
  createdAt: 1_700_000_000_000,
  savedAt: 1_760_000_000_000,
  updatedAt: 1_760_000_000_000,
  fileUrl: null,
  thumbnailUrl: null,
  screenshotUrl: null,
  linkPreviewImageUrl: null,
  metadataTitle: "A post",
  metadataDescription: null,
};

const requests: Array<{ body?: unknown; method: string; path: string }> = [];
const answerSaves = (outcome: Record<string, unknown>) => {
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      method: init?.method ?? "GET",
      // The API lives under `/api` on teakvault.com.
      path: url.pathname.replace(/^\/api/, ""),
    });
    if (init?.method === "POST" && url.pathname.endsWith("/v1/cards")) {
      return Promise.resolve(
        Response.json({
          appUrl: card.appUrl,
          card,
          cardId: card.id,
          status: "created",
          ...outcome,
        }),
      );
    }
    return Promise.resolve(
      Response.json({ error: "unexpected" }, { status: 500 }),
    );
  }) as unknown as typeof fetch;
};

const originalFetch = globalThis.fetch;
beforeEach(() => {
  toasts.length = 0;
  requests.length = 0;
  tabs = [{ active: true, title: "A post", url: "https://example.com/post" }];
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Save Current Browser Tab", () => {
  test("a tab already in Teak is saved again and moves to the top", async () => {
    answerSaves({ resaved: true });
    await saveCurrentBrowserTab();

    // One save, no duplicate check first: the save itself moves the card.
    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      "POST /v1/cards",
    ]);
    expect(requests[0]?.body).toMatchObject({
      content: "https://example.com/post",
      url: "https://example.com/post",
    });
    expect(toasts.at(-1)).toMatchObject({
      message: "Moved to the top",
      primaryAction: { title: "Open Card" },
      style: "success",
      title: "Already saved",
    });
  });

  test("a new tab is saved", async () => {
    answerSaves({});
    await saveCurrentBrowserTab();
    expect(requests).toHaveLength(1);
    expect(toasts.at(-1)).toMatchObject({
      message: undefined,
      style: "success",
      title: "Saved to Teak",
    });
  });
});

describe("saveCardWithFeedback", () => {
  test("says when a re-saved link came back from Archive", async () => {
    answerSaves({ resaved: true, wasArchived: true });
    const result = await saveCardWithFeedback(
      { content: "https://example.com/post", url: "https://example.com/post" },
      { loadingTitle: "Saving clipboard..." },
    );
    expect(result?.resaved).toBe(true);
    expect(toasts.at(-1)).toMatchObject({
      message: "Moved back from Archive",
      title: "Already saved",
    });
  });
});
