import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

export const SELECTED_MODEL_KEY = "ask_selected_model";

/**
 * Owns the Ask model dropdown's persistence directly through `LocalStorage`, replacing
 * `List.Dropdown`'s `storeValue`. See THE DROPDOWN RULE on `src/views/model/dropdown.tsx`
 * for why `storeValue` is unsafe here: it restores the dropdown's DISPLAYED value without
 * firing `onChange`, so `selectedModelId` — which is what `src/ask.tsx` resolves the model
 * actually sent to the API from — stayed on `"default"` while the dropdown showed a
 * different preset. Same defect class already fixed for the Recents Status filter
 * (`useStatusFilter` in `src/recents.tsx`); this is the same shape applied to its sibling.
 *
 * `initialModelId` is the value to start from, and it is AUTHORITATIVE when it names a
 * specific conversation's model: continuing an existing conversation from Recents must
 * open on THAT conversation's model, not on whatever the user last picked in a different
 * Ask session. Only the generic `"default"` start is treated as "nothing chosen yet" and
 * allowed to be replaced by the persisted selection.
 */
export function useSelectedModel(initialModelId: string): {
  selectedModelId: string;
  setSelectedModelId: (next: string) => void;
} {
  const [selectedModelId, setSelectedModelIdState] = useState<string>(initialModelId);

  // Whether the restore-from-storage effect is still allowed to apply. A user selection
  // that lands before the async read resolves must win — otherwise the restore would
  // stomp a choice the user already made this session, which is the same
  // "displayed value drifts from real value" failure in the opposite direction.
  const canRestoreRef = useRef(initialModelId === "default");

  useEffect(() => {
    (async () => {
      if (!canRestoreRef.current) return;
      const stored = await LocalStorage.getItem<string>(SELECTED_MODEL_KEY);
      if (!canRestoreRef.current) return;
      if (typeof stored === "string" && stored.length > 0) {
        setSelectedModelIdState(stored);
      }
    })();
    // Runs once per mount, matching every other load effect in this codebase.
  }, []);

  const setSelectedModelId = useCallback((next: string) => {
    // A real user selection: the persisted value has been superseded, so the in-flight
    // restore above must not overwrite it.
    canRestoreRef.current = false;
    setSelectedModelIdState(next);
    // Fire-and-forget, like `useStatusFilter`'s write: the displayed value already changed
    // via `setSelectedModelIdState` (the single source of truth). This write only affects
    // what the NEXT mount restores; losing it falls back to the default, which is not a
    // correctness or data-loss concern the way the collection stores' writes are.
    LocalStorage.setItem(SELECTED_MODEL_KEY, next);
  }, []);

  return { selectedModelId, setSelectedModelId };
}
