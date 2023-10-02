import { CssColor, HasId, Id } from "../lib/types";
import React from "react";
import { getPreferenceValues, Icon, Image } from "@raycast/api";
import { DEFAULT_TRANSITION_TIME_MS } from "./constants";

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

// This code can be simplified if/once the default value is read when a Raycast preference field is cleared. As of
//   writing this, clearing a preference field counts as setting it with an empty string, which results in NaN when
//   trying to parse as an integer.
export function getTransitionTimeInMs(): number {
  const { transitionTime: transitionTimePreference } = getPreferenceValues<Preferences>();
  const transitionTime = parseInt(transitionTimePreference);

  if (isNaN(transitionTime)) {
    return DEFAULT_TRANSITION_TIME_MS;
  }

  return Math.round(transitionTime);
}

export function optimisticUpdate<T extends HasId>(
  stateItem: T,
  changes: Partial<T>,
  setState: React.Dispatch<React.SetStateAction<T[]>>,
): () => void {
  let undoState: T[];

  setState((prevState: T[]) => {
    undoState = prevState;
    return prevState.updateItem(stateItem.id, changes);
  });

  return (): void => {
    setState(undoState);
  };
}

export function optimisticUpdates<T extends HasId>(
  changes: Map<Id, Partial<T>>,
  setState: React.Dispatch<React.SetStateAction<T[]>>,
): () => void {
  let undoState: T[];

  setState((prevState: T[]) => {
    undoState = prevState;
    return prevState.updateItems(changes);
  });

  return (): void => {
    setState(undoState);
  };
}
