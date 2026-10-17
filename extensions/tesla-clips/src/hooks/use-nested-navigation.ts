/**
 * Nested Raycast navigation helpers for merge/cleanup review stacks.
 *
 * @module hooks/use-nested-navigation
 */

import { useCallback, useRef, type ReactElement } from "react";
import { useNavigationStack } from "../context/navigation-stack-context";

/** Return value of {@link useNestedNavigation}. */
type UseNestedNavigationResult = {
  readonly pushScreen: (component: ReactElement) => void;
  readonly dismissStack: () => void;
};

/**
 * Tracks nested `pushView` depth and provides helpers to push screens or pop the whole stack.
 *
 * @returns Object with `pushScreen` (pushes a view and tracks depth) and `dismissStack` (pops all nested views).
 */
export function useNestedNavigation(): UseNestedNavigationResult {
  const { pushView, pop } = useNavigationStack();
  const nestedDepthRef = useRef(0);

  const pushScreen = useCallback(
    (component: ReactElement) => {
      nestedDepthRef.current += 1;
      pushView(component, () => {
        nestedDepthRef.current = Math.max(0, nestedDepthRef.current - 1);
      });
    },
    [pushView],
  );

  const dismissStack = useCallback(() => {
    const remaining = nestedDepthRef.current + 1;
    nestedDepthRef.current = 0;

    for (let index = 0; index < remaining; index += 1) {
      pop();
    }
  }, [pop]);

  return { pushScreen, dismissStack };
}
