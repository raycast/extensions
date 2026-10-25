import JSON5 from "json5";
import StyleDictionary from "style-dictionary";
import { convertToDTCG } from "style-dictionary/utils";

export type Kind = "color" | "dimension" | "duration" | "fontFamily" | "fontWeight" | "typography" | "shadow" | "other";

export type Token = {
  path: string[];
  kind: Kind;
  value: string;
  raw: unknown;
  type?: string;
  alias?: string;
};

export async function loadTokens(dirs: string[]): Promise<Token[]> {
  const sd = new StyleDictionary({
    source: dirs.map((d) => `${d.replace(/[?*()[\]{}]/g, "\\$&")}/**/*.{json,json5}`),
    usesDtcg: true,
    hooks: {
      parsers: {
        "to-dtcg": {
          pattern: /\.json5?$/,
          parser: ({ contents }) => convertToDTCG(JSON5.parse(contents), { applyTypesToGroup: false }),
        },
      },
    },
    parsers: ["to-dtcg"],
    platforms: { raw: {} },
    log: { verbosity: "silent", warnings: "disabled", errors: { brokenReferences: "console" } },
  });
  const { allTokens } = await sd.getPlatformTokens("raw");
  return allTokens.map((t) => {
    const raw = t.$value;
    const original = t.original.$value;
    const type = t.$type;
    const kind = detectKind(type, raw);
    return {
      path: t.path,
      kind,
      raw,
      type,
      value: stringify(raw, kind),
      alias: typeof original === "string" && /^\{[^}]+\}$/.test(original) ? original : undefined,
    };
  });
}

const KNOWN_TYPES: Kind[] = ["color", "dimension", "duration", "fontFamily", "fontWeight", "typography", "shadow"];

function detectKind(type: string | undefined, v: unknown): Kind {
  if (KNOWN_TYPES.includes(type as Kind)) return type as Kind;
  if (typeof v === "string") {
    if (/^(#[0-9a-f]{3,8}|(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(.*\))$/i.test(v)) return "color";
    if (/^-?[\d.]+(px|rem|em|%|vh|vw|pt|dp|sp)$/.test(v)) return "dimension";
    if (/^-?[\d.]+m?s$/.test(v)) return "duration";
  }
  const first = Array.isArray(v) ? v[0] : v;
  if (first && typeof first === "object") {
    if ("fontFamily" in first || "fontSize" in first) return "typography";
    if ("blur" in first || "offsetX" in first) return "shadow";
  }
  return "other";
}

type Shadow = {
  offsetX?: unknown;
  offsetY?: unknown;
  blur?: unknown;
  spread?: unknown;
  color?: unknown;
  inset?: boolean;
};

export function stringify(v: unknown, kind: Kind): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (!v || typeof v !== "object") return JSON.stringify(v);
  if ("unit" in v && "value" in v) return `${v.value}${v.unit}`;
  if (kind === "color" && "hex" in v) return String(v.hex);
  if (kind === "fontFamily" && Array.isArray(v)) return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ");
  if (kind === "shadow") {
    return ([v].flat() as Shadow[])
      .map((s) =>
        [s.inset && "inset", s.offsetX, s.offsetY, s.blur, s.spread, s.color]
          .filter((x) => x !== undefined && x !== false)
          .map((x) => stringify(x, "color"))
          .join(" "),
      )
      .join(", ");
  }
  return JSON.stringify(v);
}

export const startsWith = (path: string[], prefix: string[]) => prefix.every((p, i) => path[i] === p);
