import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import type { Artwork } from "./artworks";

extend([namesPlugin]);

export const SUGGESTED_COLORS = ["#B35A43", "#D6A453", "#7E8C70", "#4B6C7C", "#59537D"];

export function parseColor(input: string): string | undefined {
  const value = input.trim();
  const color = colord(/^[\da-f]{3}$|^[\da-f]{6}$/i.test(value) ? `#${value}` : value);
  return color.isValid() && color.alpha() === 1 ? color.toHex().toUpperCase() : undefined;
}

export function extractColor(input: string): string | undefined {
  const exact = parseColor(input);
  if (exact) return exact;
  const candidates = input.match(/#[\da-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/gi) ?? [];
  return candidates.length === 1 ? parseColor(candidates[0]) : undefined;
}

type Lab = readonly [number, number, number];

// OKLab conversion and matching coefficients verified against Museum's client on 2026-09-28.
export function toOKLab(hex: string): Lab {
  const linear = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const r = linear(1),
    g = linear(3),
    b = linear(5);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function compatibleHue(target: Lab, color: Lab): boolean {
  const chroma = Math.hypot(target[1], target[2]);
  const paletteChroma = Math.hypot(color[1], color[2]);
  if (chroma < 0.018) return paletteChroma <= 0.06;
  if (chroma <= 0.035) return true;
  if (paletteChroma < Math.max(0.02, chroma * 0.45)) return false;
  return target[1] * color[1] + target[2] * color[2] >= 0.5 * chroma * paletteChroma;
}

export function indexArtworks(artworks: Artwork[]) {
  return artworks.map((artwork) => ({
    artwork,
    colors: artwork.palette.map((color) => ({ lab: toOKLab(color.hex), share: color.share })),
  }));
}

export function searchArtworks(index: ReturnType<typeof indexArtworks>, hex: string, limit: number, museum?: string) {
  const target = toOKLab(hex);
  const ranked = index
    .filter(({ artwork }) => !museum || artwork.id.split(":")[0] === museum)
    .map(({ artwork, colors }) => {
      let distance = Infinity;
      let nearestDistance = Infinity;
      let coverage = 0;
      for (const color of colors) {
        const delta = Math.hypot(...color.lab.map((value, i) => value - target[i]));
        nearestDistance = Math.min(nearestDistance, delta);
        if (!compatibleHue(target, color.lab)) continue;
        distance = Math.min(distance, delta);
        if (delta < 0.13) coverage += (color.share / 100) * (1 - (delta / 0.13) ** 2) ** 2;
      }
      const matches = distance <= 0.025 || (distance <= 0.09 && coverage >= 0.07);
      return {
        artwork,
        distance: matches ? distance : nearestDistance,
        score: matches ? distance * 0.65 - coverage * 0.08 : nearestDistance,
        matches,
      };
    });
  const matches = ranked.filter((result) => result.matches);
  const closestOnly = matches.length === 0;
  const results = (closestOnly ? ranked : matches).sort(
    (a, b) => a.score - b.score || a.distance - b.distance || a.artwork.id.localeCompare(b.artwork.id),
  );
  return { closestOnly, total: results.length, results: results.slice(0, limit) };
}
