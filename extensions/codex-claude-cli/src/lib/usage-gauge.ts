/** Render provider-controlled text literally in Raycast Markdown. */
export function escapeUsageMarkdown(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\r\n]+/g, " ")
    .replace(/([\\`*_[\]{}()#!|])/g, "\\$1");
}

/** A vector readout that stays sharp in Raycast's detail pane. */
export function usageGaugeMarkdown(percent: number, title: string, dark: boolean, stale = false): string {
  const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const display = Number.isFinite(percent) ? `${Math.round(value * 10) / 10}%` : "—";
  const ink = dark ? "#f5f5f7" : "#202126";
  const muted = dark ? "#a0a0aa" : "#686874";
  const color = stale ? muted : value <= 15 ? "#ef6262" : value <= 35 ? "#d9a52d" : "#48b88c";
  const angle = Math.PI - (value / 100) * Math.PI;
  const x = 180 + 118 * Math.cos(angle);
  const y = 150 - 118 * Math.sin(angle);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="225" viewBox="0 0 360 225">
    <path d="M 62 150 A 118 118 0 0 1 298 150" fill="none" stroke="${muted}" stroke-opacity=".2" stroke-width="16" stroke-linecap="round"/>
    ${value > 0 ? `<path d="M 62 150 A 118 118 0 0 1 ${x.toFixed(3)} ${y.toFixed(3)}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"/>` : ""}
    <text x="180" y="141" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="48" font-weight="650" fill="${stale ? muted : ink}">${display}</text>
    <text x="180" y="177" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" fill="${muted}">${stale ? "last observation" : "remaining"}</text>
  </svg>`;
  const alt = escapeUsageMarkdown(`${title}: ${display} ${stale ? "at last observation" : "remaining"}`);
  return `![${alt}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}
