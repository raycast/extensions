function width(character: string): number {
  return /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\u{1f000}-\u{1ffff}]/u.test(
    character,
  )
    ? 2
    : 1;
}

export function responseRows(markdown: string, columns = 76): string[] {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .replace(/^```[^\n]*$/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .split("\n");
  const rows: string[] = [];
  for (const line of lines) {
    let remaining = Array.from(line.trim());
    while (remaining.length) {
      let end = 0;
      let used = 0;
      while (
        end < remaining.length &&
        used + width(remaining[end]) <= columns
      ) {
        used += width(remaining[end++]);
      }
      if (!end) end = 1;
      if (end < remaining.length) {
        const space = remaining.slice(0, end).lastIndexOf(" ");
        if (space > end / 2) end = space;
      }
      rows.push(remaining.slice(0, end).join("").trim());
      remaining = remaining.slice(end);
      while (remaining[0] === " ") remaining.shift();
    }
  }
  return rows.filter(Boolean);
}
