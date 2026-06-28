export function sanitizeDescription(input: string): string {
  return input
    .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
    .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
    .replace(/\\n/g, "\n\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function compareSemverStrings(a: string, b: string): number {
  const pa = a.split(".").map((s) => parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
