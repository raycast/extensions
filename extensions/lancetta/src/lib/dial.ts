import { AMBER, f, line } from "./chart";

/**
 * Lancetta's clock for a 5-hour window (its `ProjectionDial`): a 12-hour face with the hands
 * at now, and the window as sectors as long as the hour hand -- what has gone in the agent's
 * colour, what is left faint, and in amber the stretch from where the agent would stop to
 * the reset. Five hours always fit on twelve.
 *
 * Paths only, like the charts: the face is a ring of two arcs, not a `<circle>`.
 */
export type DialInput = {
  opensAt: number;
  resetsAt: number;
  now: number;
  /** When the current pace runs out: strictly between now and the reset, or null. */
  stopAt: number | null;
  tint: string;
  dark: boolean;
};

export const DIAL_SIZE = 300;
const C = DIAL_SIZE / 2;
const FACE = 132;
const SECTOR = 96;

export function dialSVG(input: DialInput): string {
  const { opensAt, resetsAt, now, stopAt, tint, dark } = input;
  const ink = dark ? "#FFFFFF" : "#000000";
  const parts: string[] = [];

  // the face
  parts.push(`<path d="${disc(FACE)}" fill="${ink}" fill-opacity="0.06"/>`);
  parts.push(`<path d="${disc(FACE)}" fill="none" stroke="${ink}" stroke-opacity="0.25" stroke-width="3"/>`);
  for (let hour = 0; hour < 12; hour++) {
    const a = (hour / 12) * 2 * Math.PI;
    const major = hour % 3 === 0;
    const [x1, y1] = polar(a, FACE - (major ? 22 : 14));
    const [x2, y2] = polar(a, FACE - 6);
    parts.push(line(x1, y1, x2, y2, ink, major ? 0.7 : 0.4, major ? 5 : 3));
  }

  // the window: gone, left, and the stopped stretch
  const end = Math.min(now, resetsAt);
  if (end > opensAt) parts.push(sector(angleAt(opensAt), angleAt(end), tint, 0.9));
  if (resetsAt > end) parts.push(sector(angleAt(end), angleAt(stopAt ?? resetsAt), ink, 0.14));
  if (stopAt !== null) parts.push(sector(angleAt(stopAt), angleAt(resetsAt), AMBER, 0.85));

  // the hands: the hour hand as long as the sectors, the minute hand to the ticks
  const date = new Date(now * 1000);
  const minutes = date.getMinutes() + date.getSeconds() / 60;
  const [mx, my] = polar((minutes / 60) * 2 * Math.PI, FACE - 26);
  parts.push(line(C, C, mx, my, ink, 0.85, 4));
  const [hx, hy] = polar(angleAt(now), SECTOR + 4);
  parts.push(line(C, C, hx, hy, ink, 1, 8));
  parts.push(`<path d="${disc(9)}" fill="${ink}"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DIAL_SIZE}" height="${DIAL_SIZE}" viewBox="0 0 ${DIAL_SIZE} ${DIAL_SIZE}">${parts.join("")}</svg>`;
}

/** Where a moment points on a 12-hour face, in radians clockwise from twelve. */
function angleAt(epoch: number): number {
  const d = new Date(epoch * 1000);
  const hours = (d.getHours() % 12) + d.getMinutes() / 60 + d.getSeconds() / 3600;
  return (hours / 12) * 2 * Math.PI;
}

function polar(angle: number, radius: number): [number, number] {
  return [C + radius * Math.sin(angle), C - radius * Math.cos(angle)];
}

/** A pie slice from `a1` clockwise to `a2`, the one shape a window is drawn with. */
function sector(a1: number, a2: number, fill: string, opacity: number): string {
  let sweep = a2 - a1;
  if (sweep < 0) sweep += 2 * Math.PI; // across twelve
  if (sweep <= 0) return "";
  const [x1, y1] = polar(a1, SECTOR);
  const [x2, y2] = polar(a1 + sweep, SECTOR);
  const large = sweep > Math.PI ? 1 : 0;
  return `<path d="M${f(C)},${f(C)} L${f(x1)},${f(y1)} A${SECTOR},${SECTOR} 0 ${large},1 ${f(x2)},${f(y2)} Z" fill="${fill}" fill-opacity="${opacity}"/>`;
}

/** A circle as two arcs. */
function disc(r: number): string {
  return `M${f(C - r)},${f(C)} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z`;
}
