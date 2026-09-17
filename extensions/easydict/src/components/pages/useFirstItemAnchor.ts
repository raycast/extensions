/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { logTrace } from "@/utils/logger";

type SelectionMode = "automatic" | "manual";

interface SelectionState {
  queryGeneration: number;
  mode: SelectionMode;
  selectedItemId?: string;
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
  const [selectionState, setSelectionState] = useState<SelectionState>(() => ({
    queryGeneration,
    mode: "automatic",
    selectedItemId: firstItemId,
  }));

  const isManualSelectionValid =
    selectionState.queryGeneration === queryGeneration &&
    selectionState.mode === "manual" &&
    selectionState.selectedItemId !== undefined &&
    itemIds.includes(selectionState.selectedItemId);
  const mode: SelectionMode = isManualSelectionValid ? "manual" : "automatic";
  const selectedItemId = isManualSelectionValid ? selectionState.selectedItemId : firstItemId;
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
    setSelectionState((previous) => {
      if (
        previous.queryGeneration === queryGeneration &&
        previous.mode === mode &&
        previous.selectedItemId === selectedItemId
      ) {
        return previous;
      }

      return {
        queryGeneration,
        mode,
        selectedItemId,
      };
    });
  }, [mode, queryGeneration, selectedItemId]);

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

      setSelectionState((previous) => {
        if (
          previous.queryGeneration === currentSelection.queryGeneration &&
          previous.mode === "manual" &&
          previous.selectedItemId === id
        ) {
          return previous;
        }
        return {
          queryGeneration: currentSelection.queryGeneration,
          mode: "manual",
          selectedItemId: id,
        };
      });
    },
    [mode, queryGeneration, selectedItemId],
  );

  return { selectedItemId, onSelectionChange };
}
