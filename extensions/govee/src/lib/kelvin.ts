/** Approximate RGB of a white at `kelvin` (Tanner Helland's fit), for lights without separate white LEDs. */
export const kelvinToRgb = (kelvin: number) => {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
};

/** The colour a light shows: in white-temperature mode it reports black RGB plus a kelvin value. */
export const visibleColor = (color: { r: number; g: number; b: number }, kelvin?: number | null) =>
  color.r === 0 && color.g === 0 && color.b === 0 && kelvin ? kelvinToRgb(kelvin) : color;
