import { Model } from "./types";
/** One physical scale for X and Z. A height cap reduces both dimensions together. */
export function diagramLayout(model: Model, left: number, right: number, maxRise = 260, top = 90) {
  const xs = model.nodes.map((n) => n.x),
    zs = model.nodes.map((n) => n.z),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  const dx = maxX - minX,
    dz = maxZ - minZ,
    scale = Math.min((right - left) / Math.max(dx, 1), maxRise / Math.max(dz, 1));
  const width = dx * scale,
    rise = dz * scale,
    start = left + (right - left - width) / 2,
    base = top + rise;
  const first = model.members
    .map((m) => ({
      a: model.nodes.find((n) => n.id === m.start)!,
      b: model.nodes.find((n) => n.id === m.end)!,
    }))
    .find((m) => Math.abs(m.b.z - m.a.z) > 1);
  const pitch = first ? (Math.atan2(first.b.z - first.a.z, Math.abs(first.b.x - first.a.x)) * 180) / Math.PI : 0;
  return {
    scale,
    rise,
    base,
    left: start,
    right: start + width,
    minX,
    maxX,
    minZ,
    maxZ,
    pitch,
    X: (x: number) => start + (x - minX) * scale,
    Y: (z: number) => base - (z - minZ) * scale,
  };
}
