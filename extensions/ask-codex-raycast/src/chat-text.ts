function displayWidth(value: string) {
  return Array.from(value).reduce(
    (width, character) =>
      width + ((character.codePointAt(0) || 0) > 0xff ? 2 : 1),
    0,
  );
}

// Native List rows do not wrap. Keep each line short enough to remain visible,
// preferring word boundaries and keeping closing punctuation on its line.
function wrapLine(value: string, limit: number, code: boolean) {
  const rows: string[] = [];
  let remaining = value;
  const indentation = code ? value.match(/^ */)?.[0] || "" : "";
  while (displayWidth(remaining) > limit) {
    const characters = Array.from(remaining);
    let width = 0;
    let end = 0;
    let wordEnd = 0;
    while (end < characters.length) {
      const character = characters[end];
      const nextWidth = width + displayWidth(character);
      if (
        end > 0 &&
        nextWidth > limit &&
        !/[，。！？；：、,.!?;:）)\]】》]/.test(character)
      )
        break;
      width = nextWidth;
      end += 1;
      if (/\s/.test(character) && width > limit / 2) wordEnd = end;
    }
    const split = !code && wordEnd ? wordEnd : end;
    rows.push(characters.slice(0, split).join("").trimEnd());
    const next = characters.slice(split).join("");
    // Do not duplicate indentation wider than the row itself.
    remaining =
      code && indentation.length < limit / 2
        ? indentation + next
        : code
          ? next
          : next.trimStart();
  }
  if (remaining.trim()) rows.push(remaining.trimEnd());
  return rows;
}

export function messageRows(content: string, limit = 78): string[] {
  const rows: string[] = [];
  let fence: string | null = null;
  for (const source of content.replace(/\r\n?/g, "\n").split("\n")) {
    const marker = source.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence && marker) {
      fence = marker[1];
      continue;
    }
    if (
      fence &&
      marker &&
      marker[1][0] === fence[0] &&
      marker[1].length >= fence.length &&
      !marker[2].trim()
    ) {
      fence = null;
      continue;
    }
    const line = fence
      ? source.replace(/\t/g, "    ")
      : source
          .trim()
          .replace(/^#{1,6}\s+/, "")
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/`([^`]+)`/g, "$1");
    if (line.trim()) rows.push(...wrapLine(line, limit, Boolean(fence)));
  }
  return rows.length ? rows : ["正在思考…"];
}

// Raycast trims leading ASCII whitespace in titles. Preserve code indentation
// visually; copy actions continue to use the original, unchanged message.
export function rowTitle(row: string) {
  return row.replace(/^ +/, (spaces) => "\u00a0".repeat(spaces.length));
}
