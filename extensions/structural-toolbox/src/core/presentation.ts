import { Model, Result } from "./types";
export function memberName(model: Model, id: string) {
  const member = model.members.find((m) => m.id === id);
  if (!member) return id;
  const a = model.nodes.find((n) => n.id === member.start)!,
    b = model.nodes.find((n) => n.id === member.end)!;
  const ridge = model.nodes.find((n) => n.id === "B"),
    first = model.nodes.find((n) => n.id === "A"),
    last = model.nodes.find((n) => n.id === "C");
  const roof =
    model.nodes.length === 3 &&
    ridge &&
    first &&
    last &&
    ridge.z > Math.max(first.z, last.z) + 1 &&
    Math.abs(first.z - last.z) < 1e-6;
  if (roof) {
    if (member.start === "A" && member.end === "B") return "Left rafter";
    if (member.start === "B" && member.end === "C") return "Right rafter";
    if (member.start === "A" && member.end === "C") return "Bottom tie";
  }
  return model.members.length === 1 ? "Beam" : "Span " + (model.members.indexOf(member) + 1);
}
export type ResponseKey = "N" | "V" | "M" | "v" | "globalZ" | "globalX";
export function activeResponse(result: Result, key: ResponseKey) {
  return result.members.some((m) =>
    m.stations.some((s) => Math.abs(s[key]) > (key === "M" ? 1e-3 : key === "N" || key === "V" ? 1e-5 : 1e-8)),
  );
}
