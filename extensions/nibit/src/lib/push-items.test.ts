import { beforeAll, describe, expect, it, vi } from "vitest";
import type { PushItem } from "./secure";

vi.mock("@raycast/api", () => ({
  Icon: {
    Document: "document",
    Globe: "globe",
    Text: "text",
  },
  LocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  getSharedClient: vi.fn(),
}));

let isFileItem: typeof import("./push-items").isFileItem;
let isImageItem: typeof import("./push-items").isImageItem;
let isUrlItem: typeof import("./push-items").isUrlItem;

beforeAll(async () => {
  ({ isFileItem, isImageItem, isUrlItem } = await import("./push-items"));
});

function makeItem(overrides: Partial<PushItem> = {}): PushItem {
  return {
    id: "item-1",
    channel: "push",
    content: "hello",
    content_type: "text/plain",
    title: null,
    source_device: "Phone",
    target_device_id: null,
    is_read: false,
    expires_at: null,
    created_at: "2026-04-21T10:00:00.000Z",
    metadata: null,
    ...overrides,
  };
}

describe("push item type helpers", () => {
  it("detects url items from plain text content", () => {
    expect(isUrlItem(makeItem({ content: "https://nibit.app" }))).toBe(true);
    expect(isUrlItem(makeItem({ content: "not a url" }))).toBe(false);
  });

  it("detects file items from blob channel or secure-blob content", () => {
    expect(isFileItem(makeItem({ channel: "blob" }))).toBe(true);
    expect(isFileItem(makeItem({ content: "secure-blob:abc" }))).toBe(true);
    expect(isFileItem(makeItem())).toBe(false);
  });

  it("detects image items as file items with image mime types", () => {
    expect(isImageItem(makeItem({ channel: "blob", content_type: "image/png" }))).toBe(true);
    expect(isImageItem(makeItem({ channel: "blob", content_type: "application/pdf" }))).toBe(false);
  });
});
