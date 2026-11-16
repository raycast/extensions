import type { Color, Image } from "@raycast/api";

/** areg's palette. Up and Down are for data only (increase and decrease), never decoration. */
export const Brand = {
  accent: { light: "#4f43b5", dark: "#ab9ff2", adjustContrast: false },
  up: { light: "#0e7a2b", dark: "#5cd17c", adjustContrast: false },
  down: { light: "#d4002f", dark: "#ff6b86", adjustContrast: false },
} satisfies Record<string, Color.Dynamic>;

const INK = { light: "#1c1c1c", dark: "#f2f0ea" };
const ACCENT = { light: "#4f43b5", dark: "#ab9ff2" };
const POSITIONS: [number, number][] = [
  [9, 9],
  [24, 9],
  [39, 9],
  [9, 24],
  [24, 24],
  [39, 24],
  [9, 39],
  [24, 39],
  [39, 39],
];

function dotsSvg(radii: number[], ink: string, accent: string): string {
  const circles = POSITIONS.map(
    ([cx, cy], i) => `<circle cx="${cx}" cy="${cy}" r="${radii[i]}" fill="${i === 8 ? accent : ink}"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">${circles}</svg>`;
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Dot radii for an org number: each digit sets one dot's size, read left to right, top to bottom. */
export function avatarRadii(orgnr: string): number[] {
  return POSITIONS.map((_, i) => 2.5 + Number(orgnr[i] ?? 0) * 0.45);
}

/**
 * A company's avatar: the areg symbol with dot sizes following its own org number. The ninth dot is the check
 * digit and is always purple.
 */
export function companyAvatar(orgnr: string | null | undefined): Image.ImageLike | undefined {
  if (!orgnr || !/^\d{9}$/.test(orgnr)) return undefined;
  const radii = avatarRadii(orgnr);
  return {
    source: {
      light: dataUri(dotsSvg(radii, INK.light, ACCENT.light)),
      dark: dataUri(dotsSvg(radii, INK.dark, ACCENT.dark)),
    },
  };
}
