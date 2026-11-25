import { Buffer } from "node:buffer";
import type { Image } from "@raycast/api";

// Match the legacy symbol aliases used by Metrix.Bar's native dashboard list.
const symbolAliases: Record<string, string> = {
  star: "star-line",
  "chart.bar": "bar-chart-2-line",
  "chart.bar.xaxis": "bar-chart-box-line",
  "chart.line.uptrend.xyaxis": "line-chart-line",
  "bitcoinsign.circle": "bit-coin-line",
  "cloud.sun": "sun-cloudy-line",
  curlybraces: "braces-line",
  link: "link",
  network: "global-line",
  terminal: "terminal-box-line",
  "wallet.pass": "wallet-3-line",
};

export function dashboardIconSource(value?: string): Image.Source | undefined {
  const icon = value?.trim();
  if (!icon) return undefined;

  if (icon.startsWith("data:image/svg+xml")) {
    const comma = icon.indexOf(",");
    if (comma === -1) return undefined;
    try {
      const payload = icon.slice(comma + 1);
      const svg = icon.slice(0, comma).endsWith(";base64")
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      if (!svg.includes("<svg")) return undefined;
      if (!svg.includes("currentColor")) return icon;
      const source = (color: string) =>
        `data:image/svg+xml,${encodeURIComponent(svg.replaceAll("currentColor", color))}`;
      return { light: source("#222326"), dark: source("#ffffff") };
    } catch {
      return undefined;
    }
  }

  if (/^(https?:\/\/|data:image\/)/u.test(icon)) return icon;

  const alias = symbolAliases[icon];
  const name = alias
    ? `ri:${alias}`
    : /^[a-z0-9-]+-(line|fill)$/u.test(icon)
      ? `ri:${icon}`
      : icon.replace(/^iconify:/u, "");
  if (!/^[a-z0-9-]+:[a-z0-9-]+$/u.test(name)) return undefined;
  const url = `https://api.iconify.design/${name.replace(":", "/")}.svg`;
  return { light: `${url}?color=%23222326`, dark: `${url}?color=%23ffffff` };
}
