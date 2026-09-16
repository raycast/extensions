import { parse } from "./parse.ts";
import { durationOutputs, retimeSpring } from "./edit-duration.ts";
export function convert(input: string, duration?: number) {
  const parsed = parse(input);
  const easing =
    parsed.easing.kind !== "spring" && duration !== undefined
      ? { ...parsed.easing, duration }
      : parsed.easing;
  return { ...parsed, easing, outputs: durationOutputs(easing, duration) };
}

export function retimeConversion(
  value: ReturnType<typeof convert>,
  seconds: number,
) {
  const easing = retimeSpring(value.easing, seconds);
  return {
    ...value,
    easing,
    outputs: durationOutputs(easing),
    notes: [
      ...value.notes.filter(
        (note) => !note.startsWith("Edited spring period:"),
      ),
      `Edited spring period: ${seconds}s; pasted source is unchanged.`,
    ],
  };
}
