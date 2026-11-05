function escapeXML(text: string) {
  return text.replace(
    /[&<>"']/g,
    (value) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[value]!,
  );
}

export function wrapPreview(text: string, limit = 31): string[] {
  const lines: string[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  for (const paragraph of text
    .replace(/\t/g, "    ")
    .split(/\r\n|[\n\r\u2028\u2029]/)) {
    const characters = Array.from(
      segmenter.segment(paragraph),
      (item) => item.segment,
    );
    if (!characters.length) {
      lines.push("");
      continue;
    }
    while (characters.length) {
      let count = Math.min(limit, characters.length);
      if (characters.length > limit) {
        const space = characters.slice(0, count).lastIndexOf(" ");
        if (space > limit / 2) count = space + 1;
      }
      lines.push(characters.splice(0, count).join(""));
    }
  }
  return lines;
}

export function pairedColumns(source: string, translation: string) {
  const sourceParagraphs = source.split(/\r\n|[\n\r\u2028\u2029]/);
  const targetParagraphs = translation.split(/\r\n|[\n\r\u2028\u2029]/);
  const left: string[] = [];
  const right: string[] = [];
  for (
    let index = 0;
    index < Math.max(sourceParagraphs.length, targetParagraphs.length);
    index++
  ) {
    const sourceLines = wrapPreview(sourceParagraphs[index] ?? "");
    const targetLines = wrapPreview(targetParagraphs[index] ?? "");
    const height = Math.max(sourceLines.length, targetLines.length);
    left.push(
      ...sourceLines,
      ...Array<string>(height - sourceLines.length).fill(""),
    );
    right.push(
      ...targetLines,
      ...Array<string>(height - targetLines.length).fill(""),
    );
  }
  return {
    source: left,
    translation: right,
    height: Math.max(280, 88 + left.length * 26),
  };
}

export function translationDocument(
  source: string,
  translation: string,
  sourceLabel: string,
  targetLabel: string,
  dark: boolean,
): string {
  const columns = pairedColumns(source, translation);
  const background = dark ? "#252525" : "#f2f2f3";
  const foreground = dark ? "#eeeeee" : "#232323";
  const muted = dark ? "#9b9b9b" : "#666666";
  function column(lines: string[], label: string, x: number) {
    return `<g transform="translate(${x} 0)"><rect width="420" height="${columns.height}" rx="16" fill="${background}"/>
<text x="24" y="31" font-family="Helvetica,sans-serif" font-size="12" font-weight="600" letter-spacing="1.2" fill="${muted}">${escapeXML(label)}</text>
<g fill="${foreground}" font-family="Helvetica,Arial,sans-serif" font-size="19" xml:space="preserve">${lines.map((line, index) => `<text x="24" y="${67 + index * 26}">${escapeXML(line)}</text>`).join("")}</g></g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="${columns.height}" viewBox="0 0 856 ${columns.height}">${column(columns.source, sourceLabel, 0)}${column(columns.translation, targetLabel, 436)}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
