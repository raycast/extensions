/**
 * A progress ring as an SVG data URI, for list icons.
 *
 * Raycast's own getProgressIcon pastes its color argument into the SVG text. A theme color like Color.Green is not a
 * valid SVG color there, so the arc never draws and only a 10% opacity track is left, which reads as "no icon". This
 * one takes a hex color, declares the SVG namespace, and uses a track that shows on light and dark backgrounds.
 */
export function ringDataUri(progress: number, color: string): string {
  const radius = 38;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(1, Math.max(0, progress)) * circumference;

  const track = `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="#8e8e93" stroke-opacity="0.45" stroke-width="${stroke}"/>`;
  // A zero-length dash with round caps would still draw a dot, so an empty ring gets no arc at all.
  const arc =
    filled > 0
      ? `<circle cx="50" cy="50" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="${filled >= circumference ? "butt" : "round"}" stroke-dasharray="${filled} ${circumference}" transform="rotate(-90 50 50)"/>`
      : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${track}${arc}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
