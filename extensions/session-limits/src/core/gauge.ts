/** A local, self-contained gauge. All interpolated values are finite numbers or fixed colors. */
export function quotaGauge(remaining: number, appearance: "light" | "dark", stale = false): string {
  if (!Number.isFinite(remaining)) throw new Error("A gauge requires a measured percentage.");
  const value = Math.round(Math.max(0, Math.min(100, remaining)) * 10) / 10;
  const dark = appearance === "dark";
  const foreground = dark ? "#F4F4F5" : "#202124";
  const muted = dark ? "#98989F" : "#73737D";
  const track = dark ? "#35353C" : "#E5E5E9";
  const accent = stale ? muted : value <= 5 ? "#EF6262" : value <= 20 ? "#E5A43B" : "#3EBB87";
  const point = (percentage: number, radius: number) => {
    const angle = Math.PI * (1 - percentage / 100);
    return {
      x: +(320 + Math.cos(angle) * radius).toFixed(2),
      y: +(250 - Math.sin(angle) * radius).toFixed(2),
    };
  };
  const end = point(value, 224);
  const tip = point(value, 174);
  const ticks = Array.from({ length: 11 }, (_, index) => {
    const from = point(index * 10, 195);
    const to = point(index * 10, index % 5 === 0 ? 179 : 187);
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${muted}" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="398" viewBox="0 0 640 398">
<path d="M96 250 A224 224 0 0 1 544 250" fill="none" stroke="${track}" stroke-width="22" stroke-linecap="round"/>
${value > 0 ? `<path d="M96 250 A224 224 0 0 1 ${end.x} ${end.y}" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>` : ""}
${ticks}
<line x1="320" y1="250" x2="${tip.x}" y2="${tip.y}" stroke="${foreground}" stroke-width="5" stroke-linecap="round"/>
<circle cx="320" cy="250" r="11" fill="${foreground}"/>
<circle cx="320" cy="250" r="4" fill="${accent}"/>
<g font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" text-anchor="middle">
<text x="96" y="287" font-size="18" fill="${muted}">0</text>
<text x="544" y="287" font-size="18" fill="${muted}">100</text>
<text x="320" y="333" font-size="60" font-weight="600" letter-spacing="-2" fill="${foreground}">${value}%</text>
<text x="320" y="369" font-size="19" fill="${muted}">${stale ? "remaining · previous reading" : "remaining"}</text>
</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
