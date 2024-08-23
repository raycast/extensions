// Function to linearly interpolate between 2 values given a third value between 0 -> 1 as it's anchor
export const lerp = (v0: number, v1: number, t: number) => (1 - t) * v0 + t * v1;

/**
 * Inverse Linar Interpolation, get the fraction between `a` and `b` on which `v` resides.
 */
export const inLerp = (a: number, b: number, v: number) => (v - a) / (b - a);

export const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(value, max));
