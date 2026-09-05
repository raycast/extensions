import type { Variant } from "../types";

export function pickVariant(
  variants: Variant[],
  targetHeight: number,
): Variant | undefined {
  return variants.reduce<Variant | undefined>((best, candidate) => {
    if (!best) return candidate;
    const closer =
      Math.abs(candidate.height - targetHeight) <
      Math.abs(best.height - targetHeight);
    return closer ? candidate : best;
  }, undefined);
}
