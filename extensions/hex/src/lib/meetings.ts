const HEADER_FIELD = /^- (Meeting|Started|Duration|App|Status): /;

export function transcriptBody(markdown: string): string {
  const lines = markdown.split("\n");
  const firstSection = lines.findIndex((line) => line.startsWith("## "));
  const headerEnd = firstSection === -1 ? lines.length : firstSection;
  return lines.filter((line, index) => index >= headerEnd || !HEADER_FIELD.test(line)).join("\n");
}
