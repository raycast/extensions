export function removeDuplicateLines(text: string): string {
  text = trimLines(text);
  return text
    .split("\n")
    .filter((v, i, a) => a.indexOf(v) === i)
    .join("\n");
}

export function sortLines(text: string): string {
  text = trimLines(text);
  return text.split("\n").sort().join("\n");
}

export function trimLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}
