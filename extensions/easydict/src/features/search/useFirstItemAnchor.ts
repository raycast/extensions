/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { logTrace } from "@/shared/logger";

type SelectionMode = "automatic" | "manual";

interface ManualSelection {
  queryGeneration: number;
  selectedItemId: string;
}

interface CurrentSelectionSnapshot {
  queryGeneration: number;
  itemIds: string[];
  mode: SelectionMode;
  selectedItemId?: string;
}

/**
 * Follows the first result until the user chooses an item. A valid user
 * selection is kept while providers insert results around it. Transient or
 * stale native selection events are ignored instead of resetting the cursor.
 */
export function useFirstItemAnchor(itemIds: string[], queryGeneration: number) {
  const firstItemId = itemIds[0];
  const [manualSelection, setManualSelection] = useState<ManualSelection>();

  const isManualSelectionValid =
    manualSelection?.queryGeneration === queryGeneration && itemIds.includes(manualSelection.selectedItemId);
  const mode: SelectionMode = isManualSelectionValid ? "manual" : "automatic";
  const selectedItemId = isManualSelectionValid ? manualSelection.selectedItemId : firstItemId;
  const selectedItemIndex = selectedItemId === undefined ? -1 : itemIds.indexOf(selectedItemId);
  const currentSelectionRef = useRef<CurrentSelectionSnapshot>({
    queryGeneration,
    itemIds,
    mode,
    selectedItemId,
  });

  useLayoutEffect(() => {
    currentSelectionRef.current = { queryGeneration, itemIds, mode, selectedItemId };
  }, [itemIds, mode, queryGeneration, selectedItemId]);

  useEffect(() => {
    setManualSelection((previous) =>
      previous?.queryGeneration === queryGeneration && itemIds.includes(previous.selectedItemId) ? previous : undefined,
    );
  }, [itemIds, queryGeneration]);

  useEffect(() => {
    logTrace(
      "ListSelection",
      `state g=${queryGeneration}, mode=${mode}, selectedIndex=${selectedItemIndex}, itemCount=${itemIds.length}, selected=${selectedItemId ?? "none"}, first=${firstItemId ?? "none"}`,
    );
  }, [firstItemId, itemIds.length, mode, queryGeneration, selectedItemId, selectedItemIndex]);

  const onSelectionChange = useCallback(
    (id: string | null) => {
      const currentSelection = currentSelectionRef.current;
      const eventIndex = id === null ? -1 : currentSelection.itemIds.indexOf(id);
      const currentSelectedIndex =
        currentSelection.selectedItemId === undefined
          ? -1
          : currentSelection.itemIds.indexOf(currentSelection.selectedItemId);
      const logEvent = (action: string) => {
        logTrace(
          "ListSelection",
          `event action=${action}, g=${currentSelection.queryGeneration}/${queryGeneration}, mode=${currentSelection.mode}/${mode}, eventIndex=${eventIndex}, selectedIndex=${currentSelectedIndex}, itemCount=${currentSelection.itemIds.length}, event=${id ?? "none"}`,
        );
      };

      if (queryGeneration !== currentSelection.queryGeneration) {
        logEvent("ignore-stale-generation");
        return;
      }

      if (id === null) {
        logEvent("ignore-null");
        return;
      }

      if (eventIndex === -1) {
        logEvent("ignore-invalid");
        return;
      }

      if (id === currentSelection.selectedItemId) {
        logEvent("acknowledge-current");
        return;
      }

      if (selectedItemId !== undefined && id === selectedItemId && selectedItemId !== currentSelection.selectedItemId) {
        logEvent("ignore-stale-acknowledgement");
        return;
      }

      logEvent("pin-manual");

      setManualSelection((previous) => {
        if (previous?.queryGeneration === currentSelection.queryGeneration && previous.selectedItemId === id) {
          return previous;
        }
        return {
          queryGeneration: currentSelection.queryGeneration,
          selectedItemId: id,
        };
      });
    },
    [mode, queryGeneration, selectedItemId],
  );

  return { selectedItemId, onSelectionChange };
}
