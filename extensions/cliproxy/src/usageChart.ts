import { DAY, Point } from "./usageModel";

export type ChartInput = {
  mode: "forecast" | "drain";
  provider: string;
  label: string;
  accounts: number;
  days?: number;
  left: number | null;
  rate: number | null;
  observedHours: number;
  history: Point[];
  projection: Point[] | null;
  now: number;
  since: number;
  dark: boolean;
  message?: string;
};

/** Compact, borderless chart content. All controls live in native actions. */
export function usageChartSvg(input: ChartInput): string {
  const { mode, provider, label, now, since } = input;
  const text = input.dark ? "#EDEDEF" : "#1D1D1F";
  const muted = input.dark ? "#96969E" : "#6E6E73";
  const grid = input.dark ? "#FFFFFF" : "#000000";
  const accent = provider === "claude" ? "#D9815B" : "#5C94E8";
  const end = mode === "forecast" ? now + (input.days ?? 7) * DAY : now;
  const maximum =
    mode === "forecast"
      ? Math.max(100, input.accounts * 100)
      : Math.max(1, ...input.history.map((p) => p.value ?? 0)) * 1.2;
  const x = (at: number) => 50 + ((at - since) / (end - since)) * 610;
  const y = (value: number) => 254 - (value / maximum) * 166;
  const pieces: string[] = [
    `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/><stop offset="100%" stop-color="${accent}" stop-opacity="0.02"/></linearGradient></defs>`,
    svgText(0, 18, `${provider === "claude" ? "Claude" : "Codex"} / ${label}`, 16, text, "600"),
    `<text x="0" y="57" fill="${text}"><tspan font-size="30" font-weight="600">${escape(mode === "forecast" ? (input.left === null ? "Unavailable" : `${Math.round(input.left)}%`) : input.rate === null ? "Learning" : `${number(input.rate)}%/h`)}</tspan><tspan dx="6" font-size="13" fill="${muted}">${escape(mode === "forecast" ? `/ ${input.accounts * 100}% remaining` : "observed mean")}</tspan></text>`,
    svgText(
      680,
      55,
      mode === "forecast" && input.rate !== null
        ? `~${number(input.rate)}%/h`
        : `${input.accounts} ${input.accounts === 1 ? "account" : "accounts"}`,
      13,
      accent,
      "500",
      "end",
    ),
    svgText(50, 87, mode === "forecast" ? "Remaining" : "Drain rate / 1-hour averages", 12, accent),
  ];
  pieces.push(svgText(660, 87, "100% = 1 account", 11, muted, "400", "end"));
  if (mode === "forecast") pieces.push(svgText(150, 87, "··· Projected", 12, muted));
  for (let i = 0; i <= 4; i++) {
    const value = (maximum * i) / 4;
    pieces.push(`<line x1="50" y1="${y(value)}" x2="660" y2="${y(value)}" stroke="${grid}" stroke-opacity="0.08"/>`);
    pieces.push(
      svgText(40, y(value) + 4, `${number(value)}${mode === "forecast" ? "%" : ""}`, 11, muted, "400", "end"),
    );
  }
  for (let i = 0; i <= 4; i++) {
    const at = since + ((end - since) * i) / 4;
    const date = new Date(at);
    const label =
      mode === "forecast" && end - since <= 2 * DAY
        ? date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" })
        : mode === "forecast" || end - since > 2 * DAY
          ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    pieces.push(svgText(x(at), 278, label, 11, muted, "400", i === 0 ? "start" : i === 4 ? "end" : "middle"));
  }
  const draw = (points: Point[], dashed: boolean) => {
    let segment: Point[] = [];
    const flush = () => {
      if (!segment.length) return;
      const line = segment.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(2)},${y(p.value!).toFixed(2)}`).join(" ");
      if (segment.length > 1)
        pieces.push(`<path d="${line} L${x(segment.at(-1)!.at)},254 L${x(segment[0].at)},254 Z" fill="url(#area)"/>`);
      pieces.push(
        `<path d="${line}" fill="none" stroke="${accent}" stroke-width="2.4" ${dashed ? 'stroke-dasharray="5 4"' : ""}/>`,
      );
      if (segment.length === 1)
        pieces.push(`<circle cx="${x(segment[0].at)}" cy="${y(segment[0].value!)}" r="3" fill="${accent}"/>`);
      segment = [];
    };
    for (const point of points) {
      if (point.value === null) flush();
      else if (point.at >= since && point.at <= end) segment.push(point);
    }
    flush();
  };
  draw(input.history, false);
  if (mode === "forecast") {
    pieces.push(`<line x1="${x(now)}" y1="88" x2="${x(now)}" y2="254" stroke="${muted}" stroke-dasharray="2 4"/>`);
    pieces.push(svgText(x(now) + 5, 117, "Now", 11, muted));
    if (input.projection) draw(input.projection, true);
  }
  const hasData = input.history.some((p) => p.value !== null) || (mode === "forecast" && input.projection);
  if (!hasData || (mode === "forecast" && !input.projection)) {
    pieces.push(
      svgText(
        mode === "forecast" ? 390 : 355,
        185,
        input.left === null ? "Quota refresh incomplete" : input.accounts ? "Learning your usage" : "No quota data",
        17,
        text,
        "500",
        "middle",
      ),
    );
    pieces.push(
      svgText(
        mode === "forecast" ? 390 : 355,
        208,
        input.left === null
          ? "Reload quota to include every account"
          : input.accounts
            ? "Collect at least 1 observed hour per account"
            : "Reload quota to collect the first sample",
        12,
        muted,
        "400",
        "middle",
      ),
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="704" height="298" viewBox="-12 -8 704 298" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${pieces.join("")}</svg>`;
}

function svgText(x: number, y: number, value: string, size: number, fill: string, weight = "400", anchor = "start") {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${escape(value)}</text>`;
}
function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function number(value: number) {
  return Number(value.toFixed(1)).toString();
}
