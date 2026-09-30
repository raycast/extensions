export function getLinksFromNewLines(input: string): string[] {
  const lines = input.split("\n");

  const urlRegex = /https?:\/\/\S+/;
  const urls = lines.map((line) => line.trim()).filter((line) => urlRegex.test(line));

  return Array.from(new Set(urls)); // remove duplicates
}
