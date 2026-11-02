import { Grid, Image } from "@raycast/api";
import { colorFormats } from "./color";
import { stringify, Token } from "./tokens";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const svg = (body: string): Image.ImageLike => ({
  source: `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">${body}</svg>`,
  ).toString("base64")}`,
});
const text = (
  t: string,
  { y = 100, size = 28, family = "-apple-system, 'Segoe UI', sans-serif", weight = "normal" } = {},
) =>
  `<text x="100" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#888" font-size="${size}" font-family="${esc(family)}" font-weight="${esc(weight)}">${esc(t)}</text>`;
const checker = `<defs><pattern id="c" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#fff"/><rect width="10" height="10" fill="#ccc"/><rect x="10" y="10" width="10" height="10" fill="#ccc"/></pattern></defs><rect width="200" height="200" rx="16" fill="url(#c)"/>`;
const px = (v: unknown) => {
  const s = stringify(v, "dimension");
  return parseFloat(s) * (/r?em$/.test(s) ? 16 : 1) || 0;
};
const field = (v: unknown, key: string): unknown =>
  v && typeof v === "object" ? (v as Record<string, unknown>)[key] : undefined;

export function preview(t: Token): Grid.Item.Props["content"] {
  switch (t.kind) {
    case "color": {
      const rgb = colorFormats(t.value)?.rgb;
      if (rgb) return { color: { light: rgb, dark: rgb, adjustContrast: false } };
      return svg(text(t.value));
    }
    case "dimension": {
      const w = t.value.endsWith("%") ? parseFloat(t.value) * 1.8 : px(t.value) * 2;
      return svg(`<rect x="10" y="88" width="${Math.min(Math.max(w, 2), 180)}" height="24" rx="6" fill="#5b8def"/>`);
    }
    case "fontFamily":
      return svg(text("Aa", { size: 96, family: t.value }));
    case "fontWeight":
      return svg(text("Aa", { size: 96, weight: t.value }));
    case "typography": {
      return svg(
        text("Aa", {
          size: Math.min(Math.max(px(field(t.raw, "fontSize")) * 3, 24), 120),
          family: stringify(field(t.raw, "fontFamily") ?? "sans-serif", "fontFamily"),
          weight: stringify(field(t.raw, "fontWeight") ?? "normal", "other"),
        }),
      );
    }
    case "shadow": {
      const layers = [t.raw].flat().filter((s) => !field(s, "inset"));
      const filters = layers
        .map((s, i) => {
          const spread = px(field(s, "spread")) * 2;
          const morph = spread
            ? `<feMorphology in="SourceAlpha" operator="${spread > 0 ? "dilate" : "erode"}" radius="${Math.abs(spread)}" result="m"/>`
            : "";
          return `<filter id="s${i}" x="-50%" y="-50%" width="200%" height="200%">${morph}<feGaussianBlur in="${spread ? "m" : "SourceAlpha"}" stdDeviation="${px(field(s, "blur"))}"/><feOffset dx="${px(field(s, "offsetX")) * 2}" dy="${px(field(s, "offsetY")) * 2}" result="o"/><feFlood flood-color="${esc(stringify(field(s, "color") ?? "#000", "color"))}"/><feComposite in2="o" operator="in"/></filter>`;
        })
        .join("");
      const rects = layers.map(
        (_, i) => `<rect x="50" y="50" width="100" height="100" rx="12" fill="#fff" filter="url(#s${i})"/>`,
      );
      return svg(
        `<defs>${filters}</defs><rect width="200" height="200" rx="16" fill="#e9e9ee"/>${rects.join("")}<rect x="50" y="50" width="100" height="100" rx="12" fill="#fff"/>`,
      );
    }
    default:
      return svg(text(t.value.length > 12 ? `${t.value.slice(0, 11)}…` : t.value));
  }
}

export function groupPreview(tokens: Token[]): Grid.Item.Props["content"] {
  const all = tokens.flatMap((t) => (t.kind === "color" ? (colorFormats(t.value)?.rgb ?? []) : []));
  if (!all.length) return preview(tokens[Math.floor(tokens.length / 2)]);
  const n = Math.min(4, all.length);
  const colors = Array.from({ length: n }, (_, i) => all[Math.round((i * (all.length - 1)) / Math.max(n - 1, 1))]);
  const w = 200 / n;
  return svg(
    `${checker}<clipPath id="r"><rect width="200" height="200" rx="16"/></clipPath><g clip-path="url(#r)">${colors
      .map((rgb, i) => `<rect x="${i * w}" width="${w}" height="200" fill="${rgb}"/>`)
      .join("")}</g>`,
  );
}
