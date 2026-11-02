// Duration resolver adapted from Motion's MIT-licensed findSpring implementation.
// https://github.com/motiondivision/motion (motion-dom spring generator)
// Copyright (c) 2024 Motion B.V. See THIRD_PARTY_NOTICES.md.
// Motion `duration` is a settling time, NOT Apple's spring duration or visualDuration.
export function motionDuration(duration: number, bounce: number) {
  const z = Math.max(0.05, Math.min(1, 1 - bounce));
  const d = Math.max(0.01, Math.min(10, duration));
  const angular = (w: number) => w * Math.sqrt(1 - z * z);
  const envelope =
    z < 1
      ? (w: number) => 0.001 - ((w * z) / angular(w)) * Math.exp(-w * z * d)
      : (w: number) => -0.001 + Math.exp(-w * d) * (w * d + 1);
  const derivative =
    z < 1
      ? (w: number) =>
          ((-envelope(w) + 0.001 > 0 ? -1 : 1) *
            (-z * z * w * w * d) *
            Math.exp(-w * z * d)) /
          angular(w * w)
      : (w: number) => -w * d * d * Math.exp(-w * d);
  let w = 5 / d;
  for (let i = 1; i < 12; i++) w -= envelope(w) / derivative(w);
  return Number.isFinite(w) && w > 0
    ? { omega0: w, zeta: z }
    : { omega0: 10, zeta: 0.5 };
}
