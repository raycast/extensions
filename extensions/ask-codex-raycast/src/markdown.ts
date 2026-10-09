// Raycast supports \(...\), \[...\] and $$...$$, but not single-dollar math.
// Keep the original Markdown and code; adapt only inline formula delimiters.
export function renderMarkdown(content: string): string {
  let fence: string | null = null;
  const markdown = content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (!fence && marker) {
        fence = marker[1];
        return line;
      }
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = null;
        return line;
      }
      if (/^( {4}|\t)/.test(line)) return line;
      const math = (value: string) =>
        value.replace(
          /(?<![\\$])\$(?![\s$])([^$\n]*?\S)(?<!\\)\$(?![$\d])/g,
          (_match, expression: string) => `\\(${expression}\\)`,
        );
      let output = "";
      let offset = 0;
      for (const code of line.matchAll(/(`+).*?\1(?!`)/g)) {
        output += math(line.slice(offset, code.index)) + code[0];
        offset = code.index + code[0].length;
      }
      return output + math(line.slice(offset));
    })
    .join("\n");
  // A streaming, unfinished code block must not absorb the next message header.
  return fence ? `${markdown}\n${fence}` : markdown;
}
