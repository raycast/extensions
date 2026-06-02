export function buildTerminalMarkdown(text: string, visibleLines: number, columns: number) {
  const body = forceVisualLineCount(text, visibleLines, columns);
  const fence = codeFenceFor(body);
  return [`${fence}text`, body, fence].join("\n");
}

export function buildWidthRuler(columns: number) {
  const safeColumns = Math.max(10, columns);
  const tens = Array.from({ length: safeColumns }, (_, index) =>
    (index + 1) % 10 === 0 ? String(Math.floor((index + 1) / 10) % 10) : " ",
  ).join("");
  const ones = Array.from({ length: safeColumns }, (_, index) => String((index + 1) % 10)).join("");
  return ["[rayterm] width " + safeColumns, tens, ones].join("\n");
}

export function buildHeightRuler(lines: number) {
  return [
    "[rayterm] height " + lines,
    ...Array.from({ length: lines }, (_, index) => String(index + 1).padStart(2, "0") + " |"),
  ].join("\n");
}

export function shellEscape(value: string) {
  return value.replace(/'/g, "'\\''").replace(/\n/g, "\\n");
}

function forceVisualLineCount(text: string, visibleLines: number, columns: number) {
  const safeVisibleLines = Math.max(1, visibleLines);
  const visualLines = toVisualLines(text, columns);
  const clipped = visualLines.slice(-safeVisibleLines);
  while (clipped.length < safeVisibleLines) clipped.push("");
  return clipped.join("\n");
}

function toVisualLines(text: string, columns: number) {
  const safeColumns = Math.max(1, columns);
  const logicalLines = text ? text.split("\n") : [""];
  const visualLines: string[] = [];

  for (const line of logicalLines) {
    if (!line) {
      visualLines.push("");
      continue;
    }
    for (let index = 0; index < line.length; index += safeColumns) {
      visualLines.push(line.slice(index, index + safeColumns));
    }
  }

  return visualLines;
}

function codeFenceFor(text: string) {
  let fence = "```";
  while (text.includes(fence)) fence += "`";
  return fence;
}
