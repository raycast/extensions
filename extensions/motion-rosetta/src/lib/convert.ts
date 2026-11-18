import { parse } from "./parse.ts";
import { durationOutputs, retimeSpring } from "./edit-duration.ts";
import type { Output, Parsed } from "./model.ts";

function reportInputLosses(outputs: Output[], parsed: Parsed): Output[] {
  const losses = parsed.inputLosses;
  if (!losses?.length) return outputs;
  return outputs.map((output) => ({
    ...output,
    fidelity: output.fidelity === "Unavailable" ? "Unavailable" : "Lossy",
    note: `${losses.join(" ")} ${output.note}`,
  }));
}
export function convert(input: string, duration?: number) {
  const parsed = parse(input);
  const easing =
    parsed.easing.kind !== "spring" && duration !== undefined
      ? { ...parsed.easing, duration }
      : parsed.easing;
  return {
    ...parsed,
    easing,
    outputs: reportInputLosses(durationOutputs(easing, duration), parsed),
  };
}

export function retimeConversion(
  value: ReturnType<typeof convert>,
  seconds: number,
) {
  const easing = retimeSpring(value.easing, seconds);
  return {
    ...value,
    easing,
    outputs: reportInputLosses(durationOutputs(easing), value),
    notes: [
      ...value.notes.filter(
        (note) => !note.startsWith("Edited spring period:"),
      ),
      `Edited spring period: ${seconds}s; pasted source is unchanged.`,
    ],
  };
}
