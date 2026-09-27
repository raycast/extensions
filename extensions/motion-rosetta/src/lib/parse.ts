import { fromDuration, type Parsed, type Stop, type Spring } from "./model.ts";
import { motionDuration } from "./motion-duration.ts";
import { CSS_KEYWORDS } from "./css-keywords.ts";
import { generatedInput } from "./generated-input.ts";

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
function numeric(text: string, maximum = 1e6): number {
  if (!NUMBER.test(text.trim()))
    throw new Error("Expected a finite number, not an expression.");
  const value = Number(text);
  if (!Number.isFinite(value) || Math.abs(value) > maximum)
    throw new Error(`Numbers must be finite and within ±${maximum}.`);
  return value;
}
function range(value: number, min: number, max: number, label: string) {
  if (value < min || value > max)
    throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}

function parseLinear(body: string): Stop[] {
  const entries = body.split(",");
  if (entries.length < 2 || entries.length > 2049)
    throw new Error("linear() needs 2–2049 stops.");
  const stops: { x?: number; y: number }[] = [];
  for (const entry of entries) {
    const tokens = entry.trim().split(/\s+/);
    if (tokens.length > 3 || !tokens[0])
      throw new Error(
        "Each linear stop needs a number and up to two percentages.",
      );
    const y = numeric(tokens[0]);
    if (tokens.length === 1) stops.push({ y });
    else
      for (const token of tokens.slice(1)) {
        if (!token.endsWith("%"))
          throw new Error("linear() positions must use percentages.");
        stops.push({ y, x: numeric(token.slice(0, -1)) / 100 });
      }
  }
  if (stops[0].x === undefined) stops[0].x = 0;
  let largest = -Infinity;
  for (const stop of stops) {
    if (stop.x !== undefined) {
      stop.x = Math.max(largest, stop.x);
      largest = stop.x;
    }
  }
  if (stops.at(-1)!.x === undefined) stops.at(-1)!.x = Math.max(1, largest);
  for (let i = 0; i < stops.length - 1; i++) {
    if (stops[i + 1].x !== undefined) continue;
    let j = i + 1;
    while (stops[j].x === undefined) j++;
    const start = stops[i].x!,
      end = stops[j].x!;
    for (let k = i + 1; k < j; k++)
      stops[k].x = start + ((end - start) * (k - i)) / (j - i);
    i = j - 1;
  }
  return stops as Stop[];
}

function objectFields(body: string): Record<string, number | string> {
  const fields: Record<string, number | string> = Object.create(null);
  for (const part of body.replace(/,\s*$/, "").split(",")) {
    const match = part
      .trim()
      .match(/^(?:["']([a-zA-Z]+)["']|([a-zA-Z]+))\s*:\s*(.*?)$/);
    if (!match)
      throw new Error(
        "Use a flat spring object with numeric values. Expressions and nested objects are not evaluated.",
      );
    const key = match[1] || match[2],
      value = match[3];
    if (key in fields) throw new Error(`Duplicate field: ${key}.`);
    fields[key] =
      key === "type"
        ? value.replace(/^["']|["']$/g, "")
        : numeric(value, ["stiffness", "damping"].includes(key) ? 1e15 : 1e6);
  }
  return fields;
}

export function parse(input: string, depth = 0): Parsed {
  if (depth > 4) throw new Error("Nested easing wrappers are not supported.");
  // Sampled exports contain at most 2049 full-precision stops. Bound parsing
  // while allowing the extension's own CSS output to be pasted back unchanged.
  if (input.length > 200000)
    throw new Error("Input is too long (maximum 200,000 characters).");
  const text = input.trim().replace(/;$/, "").trim();
  if (!text) throw new Error("Paste an easing to begin.");
  const generated = generatedInput(text);
  if (generated) return generated;
  const keyword = text.toLowerCase();
  if (Object.hasOwn(CSS_KEYWORDS, keyword))
    return {
      easing: {
        kind: "bezier",
        points: [...CSS_KEYWORDS[keyword as keyof typeof CSS_KEYWORDS]],
      },
      format: `CSS keyword · ${keyword}`,
      notes: ["CSS specification value; not a verified Figma preset."],
    };
  let match: RegExpMatchArray | null;
  // Parse data-shaped snippets only. Never evaluate pasted JavaScript or Swift.
  if (
    (match = text.match(
      /^(?:Animation)?\.timingCurve\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*duration\s*:\s*([^,)]+)\s*\)$/s,
    ))
  ) {
    const result = parse(match.slice(1, 5).join(","), depth + 1);
    if (result.easing.kind !== "bezier")
      throw new Error("Expected Bézier points.");
    return {
      ...result,
      easing: {
        ...result.easing,
        duration: range(numeric(match[5]), 0, 60, "Duration"),
      },
      format: "SwiftUI timing curve",
      notes: [],
    };
  }
  if (
    (match = text.match(
      /^transition-timing-function\s*:\s*([^;]+);?(?:\s*transition-duration\s*:\s*([\d.eE+-]+)(ms|s))?$/s,
    ))
  ) {
    const result = parse(match[1], depth + 1);
    if (result.easing.kind === "spring")
      throw new Error("Expected CSS easing.");
    return {
      ...result,
      easing: {
        ...result.easing,
        ...(match[2]
          ? {
              duration: range(
                numeric(match[2]) / (match[3] === "ms" ? 1000 : 1),
                0,
                60,
                "Duration",
              ),
            }
          : {}),
      },
      format: "CSS transition",
    };
  }
  if (
    (match = text.match(
      /^ease-\[([^\]]+)\](?:\s+duration-\[([\d.eE+-]+)(ms|s)\])?$/s,
    ))
  ) {
    const result = parse(match[1].replaceAll("_", " "), depth + 1);
    if (result.easing.kind === "spring")
      throw new Error("Expected CSS easing.");
    return {
      ...result,
      easing: {
        ...result.easing,
        ...(match[2]
          ? {
              duration: range(
                numeric(match[2]) / (match[3] === "ms" ? 1000 : 1),
                0,
                60,
                "Duration",
              ),
            }
          : {}),
      },
      format: "Tailwind easing",
    };
  }
  if (
    (match = text.match(
      /^\{\s*(?:duration\s*:\s*([^,]+),\s*)?ease\s*:\s*\[([^\]]+)\]\s*\}$/s,
    ))
  ) {
    const result = parse(match[2], depth + 1);
    if (result.easing.kind !== "bezier")
      throw new Error("Expected Bézier points.");
    return {
      ...result,
      easing: {
        ...result.easing,
        ...(match[1]
          ? { duration: range(numeric(match[1]), 0, 60, "Duration") }
          : {}),
      },
      format: "Motion Bézier",
    };
  }
  if ((match = text.match(/^CubicBezierEasing\(([^)]+)\)$/s))) {
    const result = parse(
      match[1]
        .split(",")
        .map((v) => v.trim().replace(/f$/, ""))
        .join(","),
      depth + 1,
    );
    return { ...result, format: "Compose Bézier" };
  }
  if (
    (match = text.match(
      /^spring<Float>\(\s*dampingRatio\s*=\s*([^,]+)f,\s*stiffness\s*=\s*([^,)]+)f\s*\)$/s,
    ))
  ) {
    const zeta = range(numeric(match[1], 1e15), 0, 1e15, "Damping ratio");
    const stiffness = range(
      numeric(match[2], 1e15),
      Number.MIN_VALUE,
      1e15,
      "Stiffness",
    );
    return {
      easing: {
        kind: "spring",
        omega0: Math.sqrt(stiffness),
        zeta,
        mass: 1,
        initialVelocity: 0,
      },
      format: "Compose spring",
      notes: [
        "Compose spring spec normalizes mass to 1; no initial velocity is present.",
      ],
    };
  }
  if (
    (match = text.match(
      /^tween\(durationMillis\s*=\s*(\d+),\s*easing\s*=\s*(CubicBezierEasing\([^)]*\))\s*\)$/s,
    ))
  ) {
    const result = parse(match[2], depth + 1);
    if (result.easing.kind !== "bezier")
      throw new Error("Expected Bézier points.");
    return {
      ...result,
      easing: {
        ...result.easing,
        duration: range(numeric(match[1]) / 1000, 0, 60, "Duration"),
      },
      format: "Compose tween",
    };
  }
  if ((match = text.match(/^(?:Animation)?\.interpolatingSpring\((.*)\)$/s))) {
    const fields = objectFields(match[1]);
    const keys = ["mass", "stiffness", "damping", "initialVelocity"];
    if (
      Object.keys(fields).some((key) => !keys.includes(key)) ||
      keys.some((key) => typeof fields[key] !== "number")
    )
      throw new Error(
        "Specify mass, stiffness, damping and initialVelocity as numbers.",
      );
    const result = parse(JSON.stringify(fields), depth + 1);
    return { ...result, format: "SwiftUI physical spring", notes: [] };
  }
  if (text.startsWith("{") && text.includes('"$type"')) {
    let tokens;
    try {
      tokens = JSON.parse(text);
    } catch {
      throw new Error("Use a valid JSON DTCG token document.");
    }
    if (!tokens.easing || tokens.easing.$type !== "cubicBezier")
      throw new Error(
        "A duration-only token cannot reconstruct an easing. Supply a cubicBezier easing token.",
      );
    const points = tokens.easing.$value;
    if (
      !Array.isArray(points) ||
      points.length !== 4 ||
      points.some((point) => typeof point !== "number")
    )
      throw new Error(
        "DTCG cubicBezier needs four numeric control points; references are not resolved.",
      );
    const result = parse(points.join(","), depth + 1);
    if (result.easing.kind !== "bezier")
      throw new Error("Expected Bézier points.");
    let duration: number | undefined;
    if (tokens.duration !== undefined) {
      const value = tokens.duration?.$value;
      if (
        tokens.duration?.$type !== "duration" ||
        !value ||
        typeof value.value !== "number" ||
        !["s", "ms"].includes(value.unit)
      )
        throw new Error(
          "DTCG duration needs a numeric value and s or ms unit.",
        );
      duration = range(
        numeric(String(value.value)) / (value.unit === "ms" ? 1000 : 1),
        0,
        60,
        "Duration",
      );
    }
    return {
      ...result,
      easing: {
        ...result.easing,
        ...(duration !== undefined ? { duration } : {}),
      },
      format: "DTCG cubicBezier",
      notes: [
        "Only easing and duration tokens are imported; descriptions and other tokens are not retained.",
      ],
    };
  }
  if ((match = text.match(/^linear\((.*)\)$/is)))
    return {
      easing: { kind: "linear", stops: parseLinear(match[1]) },
      format: "CSS linear()",
      notes: [],
    };
  if (
    (match = text.match(
      /^steps\(\s*(\d+)\s*(?:,\s*(jump-start|jump-end|jump-none|jump-both|start|end))?\s*\)$/i,
    ))
  ) {
    const count = range(Number(match[1]), 1, 512, "Step count");
    const raw = (match[2] || "jump-end").toLowerCase();
    const position = (
      raw === "start" ? "jump-start" : raw === "end" ? "jump-end" : raw
    ) as "jump-start" | "jump-end" | "jump-none" | "jump-both";
    if (position === "jump-none" && count < 2)
      throw new Error("jump-none needs at least two steps.");
    return {
      easing: { kind: "steps", count, position },
      format: "CSS steps()",
      notes: [],
    };
  }
  if ((match = text.match(/^(?:Animation)?\.spring\((.*)\)$/s))) {
    const f = objectFields(match[1]);
    if (Object.keys(f).some((k) => !["duration", "bounce"].includes(k)))
      throw new Error("Use .spring(duration: ..., bounce: ...).");
    if (typeof f.duration !== "number" || typeof f.bounce !== "number")
      throw new Error("Specify both duration and bounce.");
    return {
      easing: fromDuration(
        range(f.duration, 0.001, 60, "Duration"),
        range(f.bounce, -1, 1, "Bounce"),
      ),
      format: "SwiftUI spring",
      notes: ["Apple duration is the undamped period, not the settling time."],
    };
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    const f = objectFields(text.slice(1, -1));
    const allowed = [
      "type",
      "stiffness",
      "damping",
      "mass",
      "velocity",
      "initialVelocity",
      "duration",
      "visualDuration",
      "bounce",
      "restDelta",
      "restSpeed",
    ];
    const unknown = Object.keys(f).filter((k) => !allowed.includes(k));
    if (unknown.length)
      throw new Error(`Unsupported spring field: ${unknown.join(", ")}.`);
    if (f.type !== undefined && f.type !== "spring")
      throw new Error('The object type must be "spring".');
    if (!Object.keys(f).length)
      throw new Error(
        "Specify a spring type or at least one spring parameter.",
      );
    const notes: string[] = [];
    const inputLosses: string[] = [];
    if (f.velocity !== undefined && f.initialVelocity !== undefined) {
      const reason = `Both velocity and initialVelocity were supplied: velocity (${f.velocity}) takes precedence; initialVelocity (${f.initialVelocity}) was discarded.`;
      inputLosses.push(reason);
      notes.push(reason);
    }
    const num = (key: string, fallback: number) =>
      f[key] === undefined ? fallback : (f[key] as number);
    let easing: Spring;
    const physics =
      ["stiffness", "damping", "mass"].some((k) => f[k] !== undefined) ||
      !["duration", "visualDuration", "bounce"].some((k) => f[k] !== undefined);
    if (physics) {
      const m = range(num("mass", 1), 0.001, 1e6, "Mass");
      // Retimed 1 ms springs can exceed 1e6 stiffness/damping. Use explicit
      // physical-field bounds instead of weakening all numeric input limits.
      const k = range(num("stiffness", 100), 0.001, 1e15, "Stiffness");
      const c = range(num("damping", 10), 0, 1e15, "Damping");
      easing = {
        kind: "spring",
        omega0: Math.sqrt(k / m),
        zeta: c / (2 * Math.sqrt(k * m)),
        mass: m,
        initialVelocity: num("velocity", num("initialVelocity", 0)),
      };
      if (
        ["duration", "visualDuration", "bounce"].some((k) => f[k] !== undefined)
      )
        notes.push("Motion physics parameters override duration and bounce.");
      notes.push(
        "Omitted physics values use Motion defaults: mass 1, stiffness 100, damping 10, velocity 0.",
      );
    } else {
      const bounce = range(num("bounce", 0.3), 0, 1, "Bounce");
      if (inputLosses.length)
        inputLosses.push("Motion time-based springs ignore initial velocity.");
      if (f.visualDuration !== undefined) {
        // Motion visualDuration = Apple duration / 1.2. Do not equate the two.
        easing = fromDuration(
          range(num("visualDuration", 0.3), 0.001, 50, "Visual duration") * 1.2,
          Math.min(0.95, bounce),
        );
      } else {
        const duration = range(
          num("duration", 0.8),
          0.01,
          10,
          "Motion duration (seconds)",
        );
        easing = {
          kind: "spring",
          ...motionDuration(duration, bounce),
          mass: 1,
          initialVelocity: 0,
        };
        notes.push(
          `Motion duration ${duration}s uses its settling-time solver, not Apple's period.`,
        );
      }
      if (bounce > 0.95)
        notes.push(
          "Motion clamps the damping ratio to 0.05 (effective bounce 0.95).",
        );
      if (f.velocity || f.initialVelocity)
        notes.push("Motion time-based springs ignore initial velocity.");
    }
    if (f.restDelta !== undefined || f.restSpeed !== undefined)
      notes.push(
        "Rest thresholds affect runtime termination; the canonical spring retains its physical response, not those thresholds.",
      );
    return {
      easing,
      format:
        f.initialVelocity !== undefined
          ? "Figma prototype spring"
          : "Motion spring",
      notes,
      ...(inputLosses.length ? { inputLosses } : {}),
    };
  }
  const css = text.match(/^cubic-bezier\((.*)\)$/is);
  const array = text.startsWith("[") && text.endsWith("]");
  const body = css ? css[1] : array ? text.slice(1, -1) : text;
  const parts = body.split(",");
  if (parts.length !== 4)
    throw new Error(
      "Easing not recognized. Paste Bézier numbers, cubic-bezier(), linear(), a Motion spring, .timingCurve(), or .spring(). Arbitrary program code is not evaluated.",
    );
  const points = parts.map((part) => numeric(part)) as [
    number,
    number,
    number,
    number,
  ];
  range(points[0], 0, 1, "x1");
  range(points[2], 0, 1, "x2");
  return {
    easing: { kind: "bezier", points },
    format: css
      ? "CSS cubic-bezier"
      : array
        ? "Bézier array"
        : "Figma / bare Bézier",
    notes: [],
  };
}
