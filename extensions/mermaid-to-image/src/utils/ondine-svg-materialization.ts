// Ondine 0.0.3 emits root-scoped variables, not arbitrary cascading stylesheets.
// Resolve only tag attributes so diagram text is never interpreted as CSS.
export function materializeOndineSvg(svg: string): string {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const style = root.match(/\bstyle="([^"]*)"/)?.[1] ?? "";
  const variables = new Map<string, string>();
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const key = declaration.slice(0, separator).trim();
    if (key.startsWith("--")) variables.set(key, declaration.slice(separator + 1).trim());
  }

  let remainingResolutions = 10_000;
  const resolve = (expression: string, visiting = new Set<string>()): string => {
    if (visiting.size >= 32 || --remainingResolutions < 0) {
      throw new Error("Ondine SVG CSS resolution limit exceeded.");
    }
    const expanded = expression;
    let result = "";
    for (let index = 0; index < expanded.length; ) {
      if (!expanded.startsWith("var(", index)) {
        result += expanded[index++];
        continue;
      }
      let end = index + 4;
      let depth = 1;
      while (end < expanded.length && depth > 0) {
        if (expanded[end] === "(") depth++;
        if (expanded[end] === ")") depth--;
        end++;
      }
      if (depth !== 0) throw new Error("Ondine SVG contains an unclosed CSS variable.");
      const body = expanded.slice(index + 4, end - 1);
      const comma = body.indexOf(",");
      const name = (comma < 0 ? body : body.slice(0, comma)).trim();
      if (visiting.has(name)) throw new Error("Ondine SVG contains cyclic CSS variables.");
      const value = variables.get(name) ?? (comma < 0 ? undefined : body.slice(comma + 1).trim());
      if (value === undefined) throw new Error("Ondine SVG contains an unresolved CSS variable.");
      result += resolve(value, new Set([...visiting, name]));
      if (result.length > 1_000_000) throw new Error("Ondine SVG CSS expansion limit exceeded.");
      index = end;
    }
    return result.replace(
      /color-mix\(\s*in srgb\s*,\s*(#[\da-f]{3}(?:[\da-f]{3})?)\s*([\d.]+)?%?\s*,\s*(#[\da-f]{3}(?:[\da-f]{3})?)\s*([\d.]+)?%?\s*\)/gi,
      (_match, first: string, firstWeight: string | undefined, second: string, secondWeight: string | undefined) => {
        const a =
          firstWeight === undefined
            ? secondWeight === undefined
              ? 50
              : 100 - Number(secondWeight)
            : Number(firstWeight);
        const b = secondWeight === undefined ? 100 - a : Number(secondWeight);
        const rgb = (hex: string) => {
          const full =
            hex.length === 4
              ? hex
                  .slice(1)
                  .split("")
                  .map((char) => char + char)
                  .join("")
              : hex.slice(1);
          return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
        };
        const one = rgb(first);
        const two = rgb(second);
        if (a < 0 || b < 0 || a + b <= 0) throw new Error("Ondine SVG contains invalid color weights.");
        return `#${one
          .map((component, i) =>
            Math.round((component * a + two[i] * b) / (a + b))
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")}`;
      },
    );
  };

  return svg.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/([\w:-]+)="([^"]*)"/g, (attribute, name: string, value: string) => {
      if (name !== "style" && !["fill", "stroke", "color", "stroke-width", "rx", "ry", "font-family"].includes(name))
        return attribute;
      const resolved = resolve(value);
      if (/var\(|color-mix\(/.test(resolved)) throw new Error("Ondine SVG contains unsupported CSS expressions.");
      return `${name}="${resolved}"`;
    }),
  );
}
