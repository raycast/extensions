// Raycast supports \(...\), \[...\] and $$...$$, but not single-dollar math.
// Preserve message line breaks in prose; leave Markdown blocks and math intact.
function readableParagraph(line: string): string {
  // Old replies may be one long plain-text paragraph. Reflow only unformatted
  // prose at full sentence boundaries; stored/copied message text stays intact.
  if (
    line.length < 320 ||
    ["\\", "`", "$", "*", "_", "[", "]", "<", ">", "|"].some((character) =>
      line.includes(character),
    )
  )
    return line;
  let offset = 0;
  const paragraphs: string[] = [];
  for (const sentence of line.matchAll(/[。！？][”’」』）】]*/g)) {
    const end = sentence.index + sentence[0].length;
    if (end - offset >= 160 && end < line.length) {
      paragraphs.push(line.slice(offset, end));
      offset = end;
    }
  }
  return [...paragraphs, line.slice(offset)].filter(Boolean).join("\n\n");
}

export function renderMarkdown(content: string): string {
  let fence: string | null = null;
  let fencePrefix = "";
  let mathBlock: string | null = null;
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const unquote = (line: string) => line.replace(/^(?: {0,3}> ?)+/, "");
  const structure = (line: string) =>
    !line.trim() ||
    /^(?: {4}|\t| {0,3}(?:#{1,6}\s|[-+*]\s|\d+[.)]\s|`{3,}|~{3,}|(?:[-*_] *){3,}$|=+\s*$|\[[^\]]+\]:|<|\$\$|\\\[|\\begin\{))/.test(
      unquote(line),
    ) ||
    line.includes("|");
  const markdown = lines
    .map((line, index) => {
      const source = unquote(line);
      const marker = source.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (!fence && marker) {
        fence = marker[1];
        fencePrefix = line.match(/^(?: {0,3}> ?)+/)?.[0] || "";
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
      if (/^( {4}|\t)/.test(source)) return line;
      if (mathBlock) {
        if (source.includes(mathBlock)) mathBlock = null;
        return line;
      }
      const display = source
        .trim()
        .match(
          /^(\$\$|\\\[|\\begin\{(equation\*?|align\*?|aligned|gather\*?|multline\*?)\})/,
        );
      if (display) {
        const close =
          display[1] === "$$"
            ? "$$"
            : display[1] === "\\["
              ? "\\]"
              : `\\end{${display[2]}}`;
        if (!source.trim().slice(display[1].length).includes(close))
          mathBlock = close;
        return line;
      }
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
      const formattedLine = output + math(line.slice(offset));
      const formatted = structure(line)
        ? formattedLine
        : readableParagraph(formattedLine);
      const next = lines[index + 1];
      // CommonMark soft breaks otherwise collapse into spaces. Do not change
      // code, tables, headings, list boundaries or existing hard breaks.
      return next !== undefined &&
        !structure(line) &&
        !structure(next) &&
        !/(?: {2,}|\\)$/.test(formatted)
        ? `${formatted}  `
        : formatted;
    })
    .join("\n");
  // A streaming, unfinished code block must not absorb the next message header.
  return fence ? `${markdown}\n${fencePrefix}${fence}` : markdown;
}
