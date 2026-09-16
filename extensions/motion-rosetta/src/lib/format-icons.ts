export function formatIcon(id: string, appearance: "dark" | "light") {
  const brand = id.startsWith("figma")
    ? "figma"
    : id.startsWith("motion")
      ? "motion"
      : id;
  return { source: `formats/${brand}-${appearance}.png` };
}
