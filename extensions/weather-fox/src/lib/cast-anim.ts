// SMIL animation builders. Raycast's markdown renderer plays SMIL and CSS
// animations natively, so all motion ships inside the SVG itself.
// Every helper produces a seamless infinite loop.

/** Ease-in-out spline applied between every pair of values. */
function splines(count: number): string {
  return Array(count).fill("0.45 0 0.55 1").join(";");
}

function keyTimesFor(count: number): string {
  return Array.from({ length: count }, (_, i) => (i / (count - 1)).toFixed(3)).join(";");
}

interface AnimOpts {
  /** Seconds for one loop. */
  dur: number;
  /** Negative begin offsets stagger identical animations. */
  begin?: number;
  /** Smooth ease between values (default true). Linear suits constant motion. */
  ease?: boolean;
  /** Explicit keyTimes, e.g. to hold a pose most of the loop. */
  keyTimes?: number[];
}

function timing(o: AnimOpts, valueCount: number): string {
  const kt = o.keyTimes ? o.keyTimes.map((k) => k.toFixed(3)).join(";") : keyTimesFor(valueCount);
  let mode: string;
  if (o.ease !== false) {
    mode = `calcMode="spline" keyTimes="${kt}" keySplines="${splines(valueCount - 1)}"`;
  } else {
    // Linear, but custom keyTimes (hold-then-act loops) must still be emitted.
    mode = o.keyTimes ? `calcMode="linear" keyTimes="${kt}"` : "";
  }
  const begin = o.begin !== undefined ? `begin="${o.begin}s"` : "";
  return `${mode} ${begin} dur="${o.dur}s" repeatCount="indefinite"`;
}

/** Rotation around a fixed pivot, cycling through the given angles. */
export function aRotate(angles: number[], cx: number, cy: number, o: AnimOpts): string {
  const values = angles.map((a) => `${a} ${cx} ${cy}`).join(";");
  return `<animateTransform attributeName="transform" type="rotate" values="${values}" ${timing(o, angles.length)}/>`;
}

/** Translation cycling through the given offsets. */
export function aTranslate(points: [number, number][], o: AnimOpts): string {
  const values = points.map(([x, y]) => `${x} ${y}`).join(";");
  return `<animateTransform attributeName="transform" type="translate" values="${values}" ${timing(o, points.length)}/>`;
}

/** Constant-speed translation from A to B — rain, snow, conveyor loops. */
export function aTranslateLinear(from: [number, number], to: [number, number], dur: number, begin = 0): string {
  return `<animateTransform attributeName="transform" type="translate" from="${from[0]} ${from[1]}" to="${to[0]} ${to[1]}" begin="${begin}s" dur="${dur}s" repeatCount="indefinite"/>`;
}

/** Scale pulse (breathing, flap); scales toward the group's local origin. */
export function aScale(values: [number, number][], o: AnimOpts): string {
  const v = values.map(([x, y]) => `${x} ${y}`).join(";");
  return `<animateTransform attributeName="transform" type="scale" values="${v}" ${timing(o, values.length)}/>`;
}

/** Opacity cycle — twinkles, flickers, glows. */
export function aOpacity(values: number[], o: AnimOpts): string {
  return `<animate attributeName="opacity" values="${values.join(";")}" ${timing(o, values.length)}/>`;
}

/** Animate any numeric attribute (rx for ripples, offset, etc.). */
export function aAttr(name: string, values: (number | string)[], o: AnimOpts): string {
  return `<animate attributeName="${name}" values="${values.join(";")}" ${timing(o, values.length)}/>`;
}

/**
 * Wrap content in a group carrying animations. SMIL transform animations
 * replace the group's transform attribute, so animated groups must be nested
 * inside (not merged with) statically-transformed ones — this helper keeps
 * that rule in one place.
 */
export function animated(inner: string, ...anims: string[]): string {
  return `<g>${anims.join("")}${inner}</g>`;
}

/** Static wrapper + nested animated group, for placed animated things. */
export function placedAnimated(transform: string, inner: string, ...anims: string[]): string {
  return `<g transform="${transform}">${animated(inner, ...anims)}</g>`;
}
