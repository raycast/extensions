export interface InputExample {
  value: string;
  label: string;
}
export function systemExample(template: string) {
  const examples: Record<string, string> = {
    continuous: "continuous 3, 4m each, 3kN/m, C24, 100x300",
    roof: "rafter, 8m, pitch 30deg, global down, projected, 3kN/m, GL24h, 140x450",
    truss: "truss, 8m, pitch 30deg, 10kN, S355, CHS114.3x5",
    inclined: "angled, 6m, pitch 25deg, global down, 3kN/m, S355, IPE300",
    cantilever: "cantilever, 6m, 3kN/m, C24, 100x300",
    fixed: "fixed, 6m, 3kN/m, S355, IPE300",
    propped: "propped, 6m, 3kN/m, C24, 100x300",
    simple: "simply, 6m, 3kN/m, C24, 100x300",
  };
  return examples[template] || examples.simple;
}
export function annotatedExample(template: string) {
  const labels: Record<string, string[]> = {
    roof: ["system", "width", "angle", "direction", "basis", "UDL", "material", "section"],
    truss: ["system", "width", "angle", "joint load", "material", "section"],
    inclined: ["system", "span", "angle", "direction", "UDL", "material", "section"],
    continuous: ["system", "each span", "UDL", "material", "section"],
  };
  const keys = labels[template] || ["system", "span", "UDL", "material", "section"];
  return systemExample(template)
    .split(", ")
    .map((value, i) => `${value} (${keys[i]})`)
    .join(", ");
}
export function stageExamples(kind: string, template: string, suggested?: string): InputExample[] {
  if (kind === "load")
    return template === "truss"
      ? [{ value: "10kN", label: "Downward ridge load" }]
      : [
          { value: "3kN/m", label: "Distributed load, downward" },
          { value: "10kN", label: "Point load, at midpoint" },
        ];
  if (kind === "pitch") return [{ value: "pitch 30deg", label: "Inclination" }];
  if (kind === "span")
    return [
      {
        value: suggested || "6m",
        label: template === "continuous" ? "Span lengths" : "Span length",
      },
    ];
  if (kind === "section") return [{ value: suggested || "100", label: "Next dimension in mm" }];
  return [];
}
