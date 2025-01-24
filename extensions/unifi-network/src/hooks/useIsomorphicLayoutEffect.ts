// github.com/juliencrn/usehooks-ts/blob/master/packages/usehooks-ts/src/useIsomorphicLayoutEffect/useIsomorphicLayoutEffect.ts
import { useEffect, useLayoutEffect } from "react";

export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
