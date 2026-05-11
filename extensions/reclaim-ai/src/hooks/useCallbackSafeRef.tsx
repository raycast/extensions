import { useCallback, useRef } from "react";

/**
 * Returns a function that behaves identically to the one passed in, but whose reference never changes
 * (Demo: https://codepen.io/SandoCalrissian/pen/MWGgjOo)
 * @param callback The functional callback
 * @returns A function whose reference never changes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useCallbackSafeRef = <T extends (...args: any[]) => any>(callback: T): T => {
  const outCb = useRef(callback);
  outCb.current = callback;
  return useCallback(((...args) => outCb.current(...args)) as T, []);
};
