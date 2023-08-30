import { CssColor, HasId, Id, Preferences } from "../lib/types";
import React from "react";
import { getPreferenceValues, Icon, Image } from "@raycast/api";

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

export function getTransitionTimeInMs(): number | undefined {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.transitionTime === undefined) {
    return undefined;
  }

  return Math.round(parseInt(preferences.transitionTime));
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
