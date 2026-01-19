export function fmt(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "NA";
}

export function buildMarkdown(opts: {
  cleanLen: number;
  primerLen: number;
  forward: string;
  reverse: string;
  forwardGC: number;
  reverseGC: number;
  forwardTm: number;
  reverseTm: number;
}): string {
  const { cleanLen, primerLen, forward, reverse, forwardGC, reverseGC, forwardTm, reverseTm } = opts;

  if (!cleanLen) {
    return `# Primer Designer

Paste a DNA sequence (A/T/G/C).  
Anything else gets ignored.

Then hit **Design Primers**.
`;
  }

  return `# Primer Designer

**Sequence length (cleaned):** ${cleanLen} bp  
**Primer length:** ${primerLen} bp

## Forward primer (5'→3')
\`\`\`
${forward}
\`\`\`
- GC%: **${fmt(forwardGC)}**
- Tm (Wallace): **${fmt(forwardTm, 0)}°C**

## Reverse primer (5'→3')
\`\`\`
${reverse}
\`\`\`
- GC%: **${fmt(reverseGC)}**
- Tm (Wallace): **${fmt(reverseTm, 0)}°C**
`;
}
