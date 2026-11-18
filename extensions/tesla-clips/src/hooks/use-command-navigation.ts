/**
 * Top-level Raycast navigation stack for the Tesla Clips command.
 *
 * @module hooks/use-command-navigation
 */

import { useCallback, useRef, type ReactElement } from "react";
import { popToRoot, useNavigation } from "@raycast/api";

/**
 * Wraps Raycast `useNavigation` with depth tracking for multi-screen flows.
 *
 * @returns Navigation API: `pushView`, `pop`, `popToRootView`, and `depthRef` for nested stacks.
 */
export function useCommandNavigation() {
  const { push, pop } = useNavigation();
  const depthRef = useRef(0);

  const pushView = useCallback(
    (component: ReactElement, onPop?: () => void) => {
      depthRef.current += 1;
      push(component, () => {
        depthRef.current = Math.max(0, depthRef.current - 1);
        onPop?.();
      });
    },
    [push],
  );

  const popToRootView = useCallback(() => {
    void popToRoot();
    depthRef.current = 0;
  }, []);

  return { pushView, pop, popToRootView, depthRef };
}

/** Return type of {@link useCommandNavigation}. */
export type CommandNavigation = ReturnType<typeof useCommandNavigation>;
