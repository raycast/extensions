import { renderTeX } from "./render";

type Match = { start: number; end: number; latex: string; display: boolean };

export async function processMath(md: string): Promise<string> {
  const matches: Match[] = [];

  const displayRe = /\$\$([\s\S]+?)\$\$/g;
  let m: RegExpExecArray | null;
  while ((m = displayRe.exec(md))) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      latex: m[1].trim(),
      display: true,
    });
  }

  const inlineRe = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
  while ((m = inlineRe.exec(md))) {
    const start = m.index;
    const end = start + m[0].length;
    if (matches.some((d) => d.display && start >= d.start && end <= d.end))
      continue;
    matches.push({ start, end, latex: m[1].trim(), display: false });
  }

  matches.sort((a, b) => a.start - b.start);

  const rendered = await Promise.all(
    matches.map((mm) => renderTeX(mm.latex, mm.display)),
  );

  let out = "";
  let cursor = 0;
  matches.forEach((mm, i) => {
    out += md.slice(cursor, mm.start);
    out += mm.display ? `\n\n![](${rendered[i]})\n\n` : `![](${rendered[i]})`;
    cursor = mm.end;
  });
  out += md.slice(cursor);
  return out;
}
