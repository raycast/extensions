import { durationOutputs } from "./edit-duration.ts";
import type { Curve, Parsed, Stop } from "./model.ts";

// Import only our exact templates. Extract data, regenerate the candidate, then
// compare the entire program. A comment or numeric array alone never authorizes
// executing or trusting the surrounding pasted code.
export function generatedInput(text: string): Parsed | undefined {
  if (!/RosettaEasing|Easing\s*\{|ease\s*:\s*\(t\)/.test(text)) return;
  const candidates: Curve[] = [];
  let stops: Stop[] | undefined;
  const js = text.match(/const stops = (\[[\s\S]*?\]);/);
  const swift = text.match(/let stops: \[\(Double, Double\)\] = \[([^\]]*)\]/);
  const kotlin = text.match(/val stops = listOf\(([^)]*)\)/);
  try {
    if (js) {
      const data: unknown = JSON.parse(js[1]);
      if (
        Array.isArray(data) &&
        data.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every((v) => typeof v === "number"),
        )
      )
        stops = data.map(([x, y]) => ({ x, y }));
    } else if (swift) {
      stops = [...swift[1].matchAll(/\(([^,()]+),\s*([^,()]+)\)/g)].map(
        (m) => ({ x: Number(m[1]), y: Number(m[2]) }),
      );
    } else if (kotlin) {
      stops = kotlin[1].split(",").map((pair) => {
        const [x, y] = pair.split(/f\s+to\s+/);
        return { x: Number(x), y: Number(y?.replace(/f\s*$/, "")) };
      });
    }
  } catch {
    /* Reject below, never evaluate a pasted expression. */
  }
  if (
    stops &&
    stops.length >= 2 &&
    stops.length <= 4098 &&
    stops.every(
      (p, i) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        (i === 0 || p.x >= stops![i - 1].x),
    )
  )
    candidates.push({ kind: "linear", stops });
  const steps = text.match(/floor\(t \* (\d+)\)/);
  if (steps) {
    const count = Number(steps[1]);
    if (count >= 1 && count <= 512)
      for (const position of [
        "jump-start",
        "jump-end",
        "jump-none",
        "jump-both",
      ] as const)
        if (count > 1 || position !== "jump-none")
          candidates.push({ kind: "steps", count, position });
  }
  const rawDuration =
    text.match(/var duration: Double = ([\d.eE+-]+)/)?.[1] ??
    text.match(/^\{\s*duration:\s*([\d.eE+-]+)/)?.[1];
  const millis = text.match(/^tween\(durationMillis = (\d+),/)?.[1];
  const duration =
    millis !== undefined
      ? Number(millis) / 1000
      : rawDuration !== undefined
        ? Number(rawDuration)
        : undefined;
  if (
    duration !== undefined &&
    (!Number.isFinite(duration) || duration < 0 || duration > 60)
  )
    throw new Error("Invalid generated snippet duration.");
  const normalize = (code: string) => code.replace(/\s+/g, "");
  for (const candidate of candidates) {
    const easing = {
      ...candidate,
      ...(duration !== undefined ? { duration } : {}),
    };
    const output = durationOutputs(easing).find(
      (o) => o.code && normalize(o.code) === normalize(text),
    );
    if (output)
      return {
        easing,
        format: `${output.title} · Rosetta snippet`,
        notes: [
          "Recognized a generated template; no pasted code was executed.",
        ],
      };
  }
  throw new Error(
    "This program differs from a supported Rosetta template. Paste the easing data, not arbitrary executable code.",
  );
}
