function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const FONT = "&quot;Comic Sans MS&quot;, &quot;Chalkboard SE&quot;, &quot;Bradley Hand&quot;, cursive";

type Appearance = "light" | "dark";

function colors(appearance: Appearance) {
  return {
    line: appearance === "dark" ? "#cfcfcf" : "#2b2b2b",
    text: appearance === "dark" ? "#ededed" : "#1d1d1f",
    muted: appearance === "dark" ? "#9a9a9a" : "#6b6b6b",
  };
}

function encode(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

// Static top image — only changes when a new scramble is generated, so it never flickers.
export function scrambleImage(scramble: string, appearance: Appearance): string {
  const W = 1000;
  const H = 130;
  const c = colors(appearance);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<text x="${W / 2}" y="42" text-anchor="middle" font-size="30" font-family="${FONT}" font-weight="600" fill="${c.text}">${escapeXml(scramble)}</text>
<line x1="16" y1="72" x2="${W - 16}" y2="72" stroke="${c.line}" stroke-width="3"/>
</svg>`;

  return encode(svg);
}

// Just the timer number/prompt. Rendered with a fixed height so it never collapses on reload,
// which keeps the text stats below it from jumping.
export function timerImage(centerText: string, big: boolean, appearance: Appearance): string {
  const W = 1000;
  const H = 150;
  const c = colors(appearance);
  const fontSize = big ? 120 : 60;
  const y = H / 2 + fontSize * 0.34;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="${fontSize}" font-family="${FONT}" font-weight="600" fill="${c.text}">${escapeXml(centerText)}</text>
</svg>`;

  return encode(svg);
}

// Stats line, shown only at rest (never while the timer is reloading), so it stays put.
export function statsImage(text: string, appearance: Appearance): string {
  const W = 1000;
  const H = 56;
  const c = colors(appearance);
  const fontSize = 30;
  const y = H / 2 + fontSize * 0.34;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="${fontSize}" font-family="${FONT}" fill="${c.muted}">${escapeXml(text)}</text>
</svg>`;

  return encode(svg);
}
