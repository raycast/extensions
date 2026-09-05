/** Mirrors renderer/saturn/utils.ts parseCaptureInput — palette tag/company grammar. */
export interface ParsedCaptureInput {
  filterText: string;
  tags: string[];
  company?: string;
}

export function parseCaptureInput(raw: string): ParsedCaptureInput {
  let rest = raw;

  const tags: string[] = [];
  rest = rest.replace(/#([^\s#[\]/]+)/g, (_m, tag: string) => {
    const t = tag.trim();
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) {
      tags.push(t);
    }
    return " ";
  });

  let company: string | undefined;
  rest = rest.replace(/\[([^\]]*)\]/g, (_m, name: string) => {
    const n = name.trim();
    if (n) company = n;
    return " ";
  });

  const filterText = rest.replace(/\s+/g, " ").trim();
  return { filterText, tags, company };
}
