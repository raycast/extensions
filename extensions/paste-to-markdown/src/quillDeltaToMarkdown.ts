interface DeltaOp {
  insert: string | Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

interface QuillDelta {
  ops: DeltaOp[];
}

interface DeltaFormatOptions {
  strongDelimiter: string;
  emDelimiter: string;
  bulletListMarker: string;
}

function longestBacktickRun(text: string): number {
  let max = 0;
  let current = 0;
  for (const ch of text) {
    if (ch === "`") {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

function flushCodeBlock(codeLines: string[], output: string[]) {
  const maxRun = Math.max(3, ...codeLines.map((l) => longestBacktickRun(l) + 1));
  const fence = "`".repeat(maxRun);
  output.push(fence);
  output.push(...codeLines);
  output.push(fence);
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_~`[\]#>])/g, "\\$1");
}

function escapeLineStart(line: string): string {
  return line.replace(/^(\d+)\. /, "$1\\. ").replace(/^([-+*]) /, "\\$1 ");
}

function escapeLinkText(text: string): string {
  return text.replace(/([\\[\]])/g, "\\$1");
}

function escapeLinkUrl(url: string): string {
  return url.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function applyInlineFormatting(text: string, attributes: Record<string, unknown>, options: DeltaFormatOptions): string {
  if (!text) return text;

  if (attributes.code) {
    const maxRun = longestBacktickRun(text);
    const fence = "`".repeat(maxRun + 1);
    const pad = maxRun > 0 ? " " : "";
    return `${fence}${pad}${text}${pad}${fence}`;
  }

  if (attributes.link) {
    text = `[${escapeLinkText(text)}](${escapeLinkUrl(String(attributes.link))})`;
  } else {
    text = escapeMarkdown(text);
  }
  if (attributes.bold) text = `${options.strongDelimiter}${text}${options.strongDelimiter}`;
  if (attributes.italic) text = `${options.emDelimiter}${text}${options.emDelimiter}`;
  if (attributes.strike) text = `~~${text}~~`;
  if (attributes.underline) text = `<u>${text}</u>`;

  return text;
}

export function quillDeltaToMarkdown(delta: QuillDelta, options: DeltaFormatOptions): string {
  const lines: string[] = [];
  let currentLine = "";
  let listCounter = 0;
  let codeBlockLines: string[] | null = null;

  for (let opIdx = 0; opIdx < delta.ops.length; opIdx++) {
    const op = delta.ops[opIdx];
    if (typeof op.insert !== "string") {
      if (typeof op.insert === "object" && op.insert !== null) {
        const embed = op.insert as Record<string, unknown>;
        if ("mention" in embed) {
          const m = embed.mention as Record<string, string>;
          currentLine += `@${m.value ?? m.label ?? m.name ?? m.id ?? ""}`;
        } else if ("slackemoji" in embed) {
          const e = embed.slackemoji as Record<string, string>;
          currentLine += e.unicode ?? e.text ?? "";
        }
      }
      continue;
    }

    const attrs = op.attributes ?? {};
    const text = op.insert;

    const isBlockAttribute = attrs.list || attrs.blockquote || attrs["code-block"];

    if (isBlockAttribute && text === "\n") {
      if (codeBlockLines && !attrs["code-block"]) {
        flushCodeBlock(codeBlockLines, lines);
        codeBlockLines = null;
      }
      const indent = "    ".repeat(Number(attrs.indent ?? 0));
      if (attrs.list === "bullet") {
        lines.push(`${indent}${options.bulletListMarker} ${currentLine}`);
        listCounter = 0;
      } else if (attrs.list === "ordered") {
        listCounter++;
        lines.push(`${indent}${listCounter}. ${currentLine}`);
      } else if (attrs.blockquote) {
        lines.push(`> ${currentLine}`);
        listCounter = 0;
      } else if (attrs["code-block"]) {
        if (!codeBlockLines) {
          codeBlockLines = [];
        }
        codeBlockLines.push(currentLine);
      } else {
        listCounter = 0;
      }
      currentLine = "";
      continue;
    }

    const parts = text.split("\n");
    const nextOp = delta.ops[opIdx + 1];
    const nextIsCodeBlock = nextOp?.attributes?.["code-block"] && nextOp?.insert === "\n";
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        if (codeBlockLines) {
          flushCodeBlock(codeBlockLines, lines);
          codeBlockLines = null;
        }
        lines.push(escapeLineStart(currentLine));
        currentLine = "";
      }
      const skipFormatting = codeBlockLines || (nextIsCodeBlock && i === parts.length - 1);
      currentLine += skipFormatting ? parts[i] : applyInlineFormatting(parts[i], attrs, options);
    }
  }

  if (codeBlockLines) {
    flushCodeBlock(codeBlockLines, lines);
  }
  if (currentLine) {
    lines.push(escapeLineStart(currentLine));
  }

  return lines.join("\n").trim();
}
