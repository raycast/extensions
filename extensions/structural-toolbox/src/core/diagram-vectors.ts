/** Screen coordinates: x right, y down. Mechanics: Fx right, Fz up, M counterclockwise. */
export function reactionVector(x: number, y: number, fx: number, fz: number, length = 23) {
  const v = Math.hypot(fx, fz);
  if (v < 1e-10) return;
  const dx = fx / v,
    dy = -fz / v,
    tipX = x + dx * length,
    tipY = y + dy * length,
    h = Math.min(5, length * 0.3),
    w = h * 0.48;
  return {
    tipX,
    tipY,
    head: `M${tipX - h * dx - w * dy},${tipY - h * dy + w * dx} L${tipX},${tipY} L${tipX - h * dx + w * dy},${tipY - h * dy - w * dx}`,
  };
}
export function rotationVector(x: number, y: number, moment: number, r = 18) {
  if (Math.abs(moment) < 1e-3) return;
  const sign = moment > 0 ? -1 : 1;
  const start = sign < 0 ? 35 : -35;
  const angles = Array.from({ length: 41 }, (_, i) => ((start + (sign * 270 * i) / 40) * Math.PI) / 180);
  const points = angles.map((a) => [x + r * Math.cos(a), y + r * Math.sin(a)]);
  const [tipX, tipY] = points.at(-1)!,
    a = angles.at(-1)!;
  const dx = -Math.sin(a) * sign,
    dy = Math.cos(a) * sign,
    h = 5,
    w = 2.4;
  return {
    tipX,
    tipY,
    arc: points.map(([X, Y], i) => `${i ? "L" : "M"}${X},${Y}`).join(" "),
    head: `M${tipX - h * dx - w * dy},${tipY - h * dy + w * dx} L${tipX},${tipY} L${tipX - h * dx + w * dy},${tipY - h * dy - w * dx}`,
  };
}
