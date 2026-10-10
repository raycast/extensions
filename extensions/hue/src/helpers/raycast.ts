import { CssColor, DeepPartial, HasId, Id, Light } from "../lib/types";
import type HueClient from "../lib/HueClient";
import type { useHue } from "../hooks/useHue";
import React from "react";
import { getPreferenceValues, Icon, Image, showToast, Toast } from "@raycast/api";
import { DEFAULT_TRANSITION_TIME_MS } from "./constants";
import { updateItems } from "./collections";
import { logError } from "./errors";
import { RequestDroppedError } from "../lib/RateLimitedQueue";

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

  return transitionTime;
}

// Requests take a transition time, which the light's state doesn't hold.
export const withTransition = <T extends object>(changes: T) => ({
  ...changes,
  dynamics: { duration: getTransitionTimeInMs() },
});

export async function applyUpdate(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  update: {
    rateLimiter?: { canExecute(): boolean };
    lights: Map<Id, DeepPartial<Light>>;
    request: (hueClient: HueClient) => Promise<unknown>;
    success: string;
    failure: string;
  },
) {
  try {
    const { hueClient } = hueBridgeState.context;
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (update.rateLimiter && !update.rateLimiter.canExecute()) return;
    // Rooms and zones follow from their lights while rendering.
    const undo = optimisticUpdates(update.lights, setLights);
    await update.request(hueClient).catch((error) => {
      // The queue replaced this request with a newer one, whose optimistic update already includes this one's.
      if (!(error instanceof RequestDroppedError)) undo();
      throw error;
    });
    await showToast({ style: Toast.Style.Success, title: update.success });
  } catch (error) {
    if (error instanceof RequestDroppedError) return;
    logError(error);
    await showToast({
      style: Toast.Style.Failure,
      title: update.failure,
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

function optimisticUpdates<T extends HasId>(
  changes: Map<Id, DeepPartial<T>>,
  setState: React.Dispatch<React.SetStateAction<T[]>>,
): () => void {
  let undoState: T[];

  setState((prevState: T[]) => {
    undoState = prevState;
    return updateItems(prevState, changes, { existingOnly: true });
  });

  return (): void => {
    setState(undoState);
  };
}
