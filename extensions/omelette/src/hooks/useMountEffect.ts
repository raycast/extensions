// eslint-disable-next-line no-restricted-imports
import { useEffect } from "react";

/**
 * One-time effect that runs on mount only.
 * The only sanctioned use of useEffect in this codebase.
 * Valid uses: DOM integration, external system sync, browser API subscriptions.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  useEffect(effect, []);
}
