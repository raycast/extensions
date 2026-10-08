export function capitalize(text: string): string {
  if (!text) return text;

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function titleCase(text: string): string {
  if (!text) return text;

  return text.split(" ").map(capitalize).join(" ");
}
