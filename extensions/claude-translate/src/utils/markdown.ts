interface Fence {
  marker: string;
  length: number;
  info: string;
}

function readFence(line: string): Fence | null {
  let index = 0;
  while (line[index] === " ") {
    index++;
  }
  if (index > 3) {
    return null;
  }

  const marker = line[index];
  if (marker !== "`" && marker !== "~") {
    return null;
  }

  let length = 0;
  while (line[index + length] === marker) {
    length++;
  }
  if (length < 3) {
    return null;
  }

  const info = line.slice(index + length);
  if (marker === "`" && info.includes("`")) {
    return null;
  }

  return { marker, length, info };
}

function isClosingFence(line: string, opening: Fence): boolean {
  const fence = readFence(line);
  return (
    fence !== null && fence.marker === opening.marker && fence.length >= opening.length && fence.info.trim() === ""
  );
}

function findInlineCodeEnd(text: string, searchFrom: number, runLength: number): number {
  let index = searchFrom;
  while (index < text.length) {
    if (text[index] !== "`") {
      index++;
      continue;
    }

    let length = 0;
    while (text[index + length] === "`") {
      length++;
    }
    if (length === runLength) {
      return index + length;
    }
    index += length;
  }
  return -1;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;" };

function escapeHtmlChar(char: string): string {
  return HTML_ESCAPES[char] ?? char;
}

function escapeOutsideInlineCode(text: string): string {
  let result = "";
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (char === "`") {
      let runLength = 0;
      while (text[index + runLength] === "`") {
        runLength++;
      }
      const end = findInlineCodeEnd(text, index + runLength, runLength);
      const stop = end === -1 ? index + runLength : end;
      result += text.slice(index, stop);
      index = stop;
      continue;
    }

    result += escapeHtmlChar(char);
    index++;
  }

  return result;
}

export function escapeMarkdownHtml(text: string): string {
  const output: string[] = [];
  let prose: string[] = [];
  let openFence: Fence | null = null;

  const flushProse = () => {
    if (prose.length > 0) {
      output.push(escapeOutsideInlineCode(prose.join("\n")));
      prose = [];
    }
  };

  for (const line of text.split("\n")) {
    if (openFence !== null) {
      output.push(line);
      if (isClosingFence(line, openFence)) {
        openFence = null;
      }
      continue;
    }

    const fence = readFence(line);
    if (fence !== null) {
      flushProse();
      output.push(line);
      openFence = fence;
      continue;
    }

    prose.push(line);
  }

  flushProse();
  return output.join("\n");
}
