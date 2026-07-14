function normalizeHexColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const normalized = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function blendHex(foreground: string, background: string, foregroundRatio: number): string {
  const fg = normalizeHexColor(foreground, "#000000");
  const bg = normalizeHexColor(background, "#ffffff");
  const ratio = Math.max(0, Math.min(1, foregroundRatio));

  const fgRgb = [parseInt(fg.slice(1, 3), 16), parseInt(fg.slice(3, 5), 16), parseInt(fg.slice(5, 7), 16)];
  const bgRgb = [parseInt(bg.slice(1, 3), 16), parseInt(bg.slice(3, 5), 16), parseInt(bg.slice(5, 7), 16)];

  const mixed = fgRgb.map((component, index) => Math.round(component * ratio + bgRgb[index] * (1 - ratio)));

  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function resolveCssVariableExpression(
  expression: string,
  resolvedColors: Map<string, string>,
  fallback: string,
): string {
  const trimmed = expression.trim();

  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(trimmed)) {
    return normalizeHexColor(trimmed, fallback);
  }

  const varMatch = trimmed.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+|#[0-9a-f]{3,6}))?\)$/i);
  if (varMatch) {
    const [, variableName, fallbackExpression] = varMatch;
    const resolved = resolvedColors.get(variableName);
    if (resolved) {
      return normalizeHexColor(resolved, fallback);
    }
    if (fallbackExpression) {
      return resolveCssVariableExpression(fallbackExpression, resolvedColors, fallback);
    }
  }

  const colorMixMatch = trimmed.match(
    /^color-mix\(\s*in srgb,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*\)$/i,
  );
  if (colorMixMatch) {
    const [, firstColorExpression, firstPercentage, secondColorExpression, secondPercentage] = colorMixMatch;
    const total = Number(firstPercentage) + Number(secondPercentage);
    const secondRatio = total > 0 ? Number(secondPercentage) / total : 0.5;
    const firstColor = resolveCssVariableExpression(firstColorExpression, resolvedColors, fallback);
    const secondColor = resolveCssVariableExpression(secondColorExpression, resolvedColors, fallback);
    return blendHex(secondColor, firstColor, secondRatio);
  }

  return normalizeHexColor(trimmed, fallback);
}

export function materializeSvgColorsForPreview(svgContent: string): string {
  const rootStyleMatch = svgContent.match(/<svg[^>]*style="([^"]*)"/i);
  const rootStyle = rootStyleMatch?.[1] ?? "";

  const rootVars = new Map<string, string>();
  for (const declaration of rootStyle.split(";")) {
    const [rawKey, rawValue] = declaration.split(":");
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (key.startsWith("--")) {
      rootVars.set(key, value);
    }
  }

  const bg = normalizeHexColor(rootVars.get("--bg"), "#ffffff");
  const fg = normalizeHexColor(rootVars.get("--fg"), "#1f2937");

  const resolvedColors = new Map<string, string>([
    ["--bg", bg],
    ["--fg", fg],
  ]);

  for (const variableName of ["--line", "--accent", "--muted", "--surface", "--border"] as const) {
    const value = rootVars.get(variableName);
    if (value) {
      resolvedColors.set(variableName, normalizeHexColor(value, bg));
    }
  }

  resolvedColors.set("--_text", fg);
  resolvedColors.set(
    "--_text-sec",
    resolveCssVariableExpression(
      "var(--muted, color-mix(in srgb, var(--fg) 60%, var(--bg)))",
      resolvedColors,
      blendHex(fg, bg, 0.6),
    ),
  );
  resolvedColors.set(
    "--_text-muted",
    resolveCssVariableExpression(
      "var(--muted, color-mix(in srgb, var(--fg) 40%, var(--bg)))",
      resolvedColors,
      blendHex(fg, bg, 0.4),
    ),
  );
  resolvedColors.set(
    "--_text-faint",
    resolveCssVariableExpression(
      "color-mix(in srgb, var(--fg) 25%, var(--bg))",
      resolvedColors,
      blendHex(fg, bg, 0.25),
    ),
  );
  resolvedColors.set(
    "--_line",
    resolveCssVariableExpression(
      "var(--line, color-mix(in srgb, var(--fg) 50%, var(--bg)))",
      resolvedColors,
      blendHex(fg, bg, 0.5),
    ),
  );
  resolvedColors.set(
    "--_arrow",
    resolveCssVariableExpression(
      "var(--accent, color-mix(in srgb, var(--fg) 85%, var(--bg)))",
      resolvedColors,
      blendHex(fg, bg, 0.85),
    ),
  );
  resolvedColors.set(
    "--_node-fill",
    resolveCssVariableExpression(
      "var(--surface, color-mix(in srgb, var(--fg) 3%, var(--bg)))",
      resolvedColors,
      blendHex(fg, bg, 0.03),
    ),
  );
  resolvedColors.set(
    "--_node-stroke",
    resolveCssVariableExpression(
      "var(--border, color-mix(in srgb, var(--fg) 20%, var(--bg)))",
      resolvedColors,
      blendHex(fg, bg, 0.2),
    ),
  );
  resolvedColors.set("--_group-fill", bg);
  resolvedColors.set(
    "--_group-hdr",
    resolveCssVariableExpression("color-mix(in srgb, var(--fg) 5%, var(--bg))", resolvedColors, blendHex(fg, bg, 0.05)),
  );
  resolvedColors.set(
    "--_inner-stroke",
    resolveCssVariableExpression(
      "color-mix(in srgb, var(--fg) 12%, var(--bg))",
      resolvedColors,
      blendHex(fg, bg, 0.12),
    ),
  );
  resolvedColors.set(
    "--_key-badge",
    resolveCssVariableExpression("color-mix(in srgb, var(--fg) 10%, var(--bg))", resolvedColors, blendHex(fg, bg, 0.1)),
  );

  const xychartColorMatches = svgContent.matchAll(/--xychart-color-(\d+)\s*:\s*([^;]+);/gi);
  for (const [, seriesIndex, colorExpression] of xychartColorMatches) {
    resolvedColors.set(
      `--xychart-color-${seriesIndex}`,
      resolveCssVariableExpression(colorExpression, resolvedColors, "#3b82f6"),
    );
  }

  const xychartBarFillMatches = svgContent.matchAll(/--xychart-bar-fill-(\d+)\s*:\s*([^;]+);/gi);
  for (const [, seriesIndex, fillExpression] of xychartBarFillMatches) {
    resolvedColors.set(
      `--xychart-bar-fill-${seriesIndex}`,
      resolveCssVariableExpression(fillExpression, resolvedColors, blendHex("#3b82f6", bg, 0.25)),
    );
  }

  let materialized = svgContent;
  for (const [variableName, color] of resolvedColors) {
    materialized = materialized.replaceAll(`var(${variableName})`, color);
  }

  return materialized;
}
