import { useEffect, useRef, useState } from "react";
import { getItem } from "./pass-cli";
import { itemKey } from "./format";
import { Item, ItemDetail } from "./types";

const DETAIL_DEBOUNCE_MS = 150;

function detailKey(item: Item): string {
  return `${itemKey(item)}:${item.modifiedAt ?? ""}`;
}

/**
 * Item details include secrets, so they are only loaded on demand and kept in memory for as long as
 * the command is open. They are never written to the LocalStorage cache.
 */
export class ItemDetailStore {
  private readonly pending = new Map<string, Promise<ItemDetail>>();
  private readonly loaded = new Map<string, ItemDetail>();

  peek(item: Item): ItemDetail | undefined {
    return this.loaded.get(detailKey(item));
  }

  load(item: Item): Promise<ItemDetail> {
    const key = detailKey(item);
    let pending = this.pending.get(key);
    if (!pending) {
      pending = getItem(item.shareId, item.itemId, item.vaultName);
      this.pending.set(key, pending);
      pending.then(
        (detail) => this.loaded.set(key, detail),
        () => this.pending.delete(key),
      );
    }
    return pending;
  }
}

/** Details of the selected item, loaded after a short delay so that scrolling doesn't load every row. */
export function useItemDetail(store: ItemDetailStore, item: Item | undefined) {
  const key = item ? detailKey(item) : undefined;
  const itemRef = useRef(item);
  itemRef.current = item;
  const [state, setState] = useState<{ key: string; detail?: ItemDetail; error?: string }>();

  useEffect(() => {
    const current = itemRef.current;
    if (!key || !current || store.peek(current)) return;

    let cancelled = false;
    // Debounced so that scrolling through the list doesn't start a pass-cli process for every row.
    const timer = setTimeout(() => {
      store.load(current).then(
        (detail) => {
          if (!cancelled) setState({ key, detail });
        },
        (error: unknown) => {
          if (!cancelled) setState({ key, error: error instanceof Error ? error.message : String(error) });
        },
      );
    }, DETAIL_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, store]);

  const cached = item ? store.peek(item) : undefined;
  const current = state?.key === key ? state : undefined;
  return {
    detail: cached ?? current?.detail,
    error: current?.error,
    isLoading: key !== undefined && !cached && !current,
  };
}
