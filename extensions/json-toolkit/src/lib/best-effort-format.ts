type BalancedSpan = {
  end: number;
  start: number;
  text: string;
};

function isOpeningDelimiter(character: string): character is "{" | "[" {
  return character === "{" || character === "[";
}

function matchingDelimiter(character: "{" | "["): "}" | "]" {
  return character === "{" ? "}" : "]";
}

function findBalancedSpans(input: string): BalancedSpan[] {
  const stack: Array<{ closing: "}" | "]"; start: number }> = [];
  const completed: BalancedSpan[] = [];
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (stack.length === 0) {
      if (isOpeningDelimiter(character)) {
        stack.push({ closing: matchingDelimiter(character), start: index });
      }
      continue;
    }

    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (isOpeningDelimiter(character)) {
      stack.push({ closing: matchingDelimiter(character), start: index });
      continue;
    }

    if (character === "}" || character === "]") {
      const opening = stack.at(-1);
      if (!opening || opening.closing !== character) {
        stack.length = 0;
        quote = null;
        escaped = false;
        lineComment = false;
        blockComment = false;
        continue;
      }

      stack.pop();
      completed.push({
        end: index,
        start: opening.start,
        text: input.slice(opening.start, index + 1),
      });
    }
  }

  completed.sort(
    (left, right) => left.start - right.start || right.end - left.end,
  );

  const outermost: BalancedSpan[] = [];
  for (const span of completed) {
    const previous = outermost.at(-1);
    if (!previous || span.start > previous.end) {
      outermost.push(span);
    }
  }

  return outermost;
}

function looksJsonLike(span: string): boolean {
  const trimmed = span.trim();
  if (trimmed === "{}" || trimmed === "[]") {
    return true;
  }

  if (trimmed.startsWith("{")) {
    return /[:,]|\/\/|\/\*/u.test(trimmed);
  }

  const content = trimmed.slice(1, -1).trim();
  return (
    content.length === 0 ||
    content.includes(",") ||
    /^["'{[\d\-tfn]/u.test(content) ||
    content.startsWith("/*") ||
    content.startsWith("//")
  );
}

function nextNonWhitespace(input: string, start: number): string | undefined {
  for (let index = start; index < input.length; index += 1) {
    if (!/\s/u.test(input[index])) {
      return input[index];
    }
  }

  return undefined;
}

export function formatJsonLikeSpan(input: string, indentSize = 2): string {
  let output = "";
  let depth = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  const indentation = () => " ".repeat(Math.max(0, depth) * indentSize);
  const trimHorizontalWhitespace = (preserveLineIndentation = false) => {
    const currentLine = output.slice(output.lastIndexOf("\n") + 1);
    if (preserveLineIndentation && currentLine.trim().length === 0) {
      return;
    }
    output = output.replace(/[ \t]+$/u, "");
  };
  const startLine = () => {
    trimHorizontalWhitespace();
    output = output.replace(/\n+$/u, "");
    output += `\n${indentation()}`;
  };
  const resetCurrentIndentation = () => {
    const lastNewline = output.lastIndexOf("\n");
    if (lastNewline < 0) {
      return;
    }
    output = `${output.slice(0, lastNewline + 1)}${indentation()}`;
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (lineComment) {
      if (character === "\r" && next === "\n") {
        lineComment = false;
        index += 1;
        startLine();
      } else if (character === "\n" || character === "\r") {
        lineComment = false;
        startLine();
      } else {
        output += character;
      }
      continue;
    }

    if (blockComment) {
      output += character;
      if (character === "*" && next === "/") {
        output += next;
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      output += character;
      continue;
    }

    if (character === "/" && next === "/") {
      trimHorizontalWhitespace();
      output += "//";
      lineComment = true;
      index += 1;
      continue;
    }

    if (character === "/" && next === "*") {
      trimHorizontalWhitespace(true);
      if (output && !/[\s[{:]/u.test(output.at(-1) ?? "")) {
        output += " ";
      }
      output += "/*";
      blockComment = true;
      index += 1;
      continue;
    }

    if (character === "{" || character === "[") {
      if (!output.endsWith(": ")) {
        trimHorizontalWhitespace(true);
      }
      output += character;
      depth += 1;
      const closing = character === "{" ? "}" : "]";
      if (nextNonWhitespace(input, index + 1) !== closing) {
        startLine();
      }
      continue;
    }

    if (character === "}" || character === "]") {
      depth = Math.max(0, depth - 1);
      trimHorizontalWhitespace();
      if (
        output.endsWith("\n") ||
        /^\s*$/u.test(output.slice(output.lastIndexOf("\n") + 1))
      ) {
        resetCurrentIndentation();
      } else {
        startLine();
      }
      output += character;
      continue;
    }

    if (character === ",") {
      trimHorizontalWhitespace();
      output += ",";
      startLine();
      continue;
    }

    if (character === ":") {
      trimHorizontalWhitespace();
      output += ": ";
      continue;
    }

    if (/\s/u.test(character)) {
      const previous = output.at(-1);
      const upcoming = nextNonWhitespace(input, index + 1);
      if (
        previous &&
        !/\s/u.test(previous) &&
        !["{", "[", ":"].includes(previous) &&
        upcoming &&
        !["}", "]", ",", ":"].includes(upcoming)
      ) {
        output += " ";
      }
      continue;
    }

    output += character;
  }

  return output.trim();
}

export function bestEffortFormat(input: string): string {
  const spans = findBalancedSpans(input).filter((span) =>
    looksJsonLike(span.text),
  );
  if (spans.length === 0) {
    return input;
  }

  let output = "";
  let cursor = 0;

  for (const span of spans) {
    output += input.slice(cursor, span.start);
    output += formatJsonLikeSpan(span.text);
    cursor = span.end + 1;
  }

  return output + input.slice(cursor);
}
