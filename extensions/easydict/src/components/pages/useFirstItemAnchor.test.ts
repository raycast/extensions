// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFirstItemAnchor } from "./useFirstItemAnchor";

vi.mock("@/utils/logger", () => ({ logTrace: vi.fn() }));

describe("useFirstItemAnchor", () => {
  it("follows earlier provider results while selection remains automatic", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: ["provider-c:item"], queryGeneration: 1 } },
    );

    expect(result.current.selectedItemId).toBe("provider-c:item");

    act(() => result.current.onSelectionChange("provider-c:item"));
    rerender({ itemIds: ["provider-b:item", "provider-c:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-b:item");

    act(() => result.current.onSelectionChange("provider-b:item"));
    rerender({ itemIds: ["provider-a:item", "provider-b:item", "provider-c:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-a:item");
  });

  it("preserves a valid user selection when a new first result arrives", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: ["provider-a:item", "provider-b:item"], queryGeneration: 1 } },
    );

    act(() => result.current.onSelectionChange("provider-b:item"));
    expect(result.current.selectedItemId).toBe("provider-b:item");

    rerender({ itemIds: ["provider-c:item", "provider-a:item", "provider-b:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-b:item");
  });

  it("preserves a manual selection of the first item when another result arrives before it", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: ["provider-a:item", "provider-b:item"], queryGeneration: 1 } },
    );

    act(() => result.current.onSelectionChange("provider-b:item"));
    act(() => result.current.onSelectionChange("provider-a:item"));
    expect(result.current.selectedItemId).toBe("provider-a:item");

    rerender({ itemIds: ["provider-c:item", "provider-a:item", "provider-b:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-a:item");
  });

  it("ignores a delayed acknowledgement of the previous automatic selection", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: ["provider-c:item"], queryGeneration: 1 } },
    );
    const previousSelectionHandler = result.current.onSelectionChange;

    rerender({ itemIds: ["provider-b:item", "provider-c:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-b:item");

    act(() => previousSelectionHandler("provider-c:item"));
    expect(result.current.selectedItemId).toBe("provider-b:item");

    act(() => result.current.onSelectionChange("provider-c:item"));
    expect(result.current.selectedItemId).toBe("provider-c:item");
  });

  it("falls back once when the selected item disappears", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: ["provider-a:item", "provider-b:item"], queryGeneration: 1 } },
    );

    act(() => result.current.onSelectionChange("provider-b:item"));
    expect(result.current.selectedItemId).toBe("provider-b:item");

    rerender({ itemIds: ["provider-c:item", "provider-a:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-c:item");

    rerender({ itemIds: ["provider-d:item", "provider-c:item", "provider-a:item"], queryGeneration: 1 });
    expect(result.current.selectedItemId).toBe("provider-d:item");
  });

  it("resets to the first item for a new query generation", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: ["item:first", "item:second"], queryGeneration: 1 } },
    );

    act(() => result.current.onSelectionChange("item:second"));
    expect(result.current.selectedItemId).toBe("item:second");

    rerender({ itemIds: ["item:first", "item:second"], queryGeneration: 2 });
    expect(result.current.selectedItemId).toBe("item:first");

    rerender({ itemIds: ["item:leading", "item:first", "item:second"], queryGeneration: 2 });
    expect(result.current.selectedItemId).toBe("item:leading");
  });

  it("selects the first item that appears after an empty query starts", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      { initialProps: { itemIds: [] as string[], queryGeneration: 2 } },
    );

    expect(result.current.selectedItemId).toBeUndefined();

    rerender({ itemIds: ["query:new:first"], queryGeneration: 2 });

    expect(result.current.selectedItemId).toBe("query:new:first");
  });

  it("ignores null and invalid selection changes", () => {
    const { result } = renderHook(() => useFirstItemAnchor(["provider-a:item", "provider-b:item"], 1));

    act(() => result.current.onSelectionChange("provider-b:item"));
    expect(result.current.selectedItemId).toBe("provider-b:item");

    act(() => result.current.onSelectionChange(null));
    expect(result.current.selectedItemId).toBe("provider-b:item");

    act(() => result.current.onSelectionChange("missing:item"));
    expect(result.current.selectedItemId).toBe("provider-b:item");
  });

  it("ignores a delayed callback from the previous query generation even when item IDs are reused", () => {
    const { result, rerender } = renderHook(
      ({ itemIds, queryGeneration }) => useFirstItemAnchor(itemIds, queryGeneration),
      {
        initialProps: {
          itemIds: ["item:first", "item:second"],
          queryGeneration: 1,
        },
      },
    );
    const previousQueryHandler = result.current.onSelectionChange;

    rerender({
      itemIds: ["item:first", "item:second"],
      queryGeneration: 2,
    });
    act(() => result.current.onSelectionChange("item:second"));
    expect(result.current.selectedItemId).toBe("item:second");

    act(() => previousQueryHandler("item:first"));

    expect(result.current.selectedItemId).toBe("item:second");
  });
});
