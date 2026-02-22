function toWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.\\/]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
export function toCamelCase(input: string): string {
  const words = toWords(input);

  if (words.length === 0) return "";

  return (
    words[0] +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")
  );
}
export function toPascalCase(input: string): string {
  return toWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
export function toSnakeCase(input: string): string {
  return toWords(input).join("_");
}
export function toKebabCase(input: string): string {
  return toWords(input).join("-");
}
export function toDotCase(input: string): string {
  return toWords(input).join(".");
}

export function toUpperCase(input: string): string {
  return input.toUpperCase();
}
export function toLowerCase(input: string): string {
  return input.toLowerCase();
}
export function toConstantCase(input: string): string {
  return toWords(input).join("_").toUpperCase();
}
