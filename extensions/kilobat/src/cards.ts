import { bar, dot, fit, icons, ink, inset, panel, row, sparkline, speedDial, svg, text, wrap } from "./draw";
import { formatBytes, formatRate } from "./format";
import type { Conditions, NetworkApp, SpeedTest, WhyReport, WiFi } from "./kilobat";

export const WIDE = 700;
export const NARROW = 420;

// Speed test

export type Phase = "latency" | "download" | "upload" | "complete";
export type Live = {
  phase: Phase;
  fraction: number;
  elapsed: number;
  down: number[];
  up: number[];
};

const phaseTitle: Record<Phase, string> = {
  latency: "Checking latency",
  download: "Downloading",
  upload: "Uploading",
  complete: "Finishing",
};

/** The app's readinessColor: rose for too little bandwidth, orange when it may stutter, blue when fine. */
function readinessColor(value?: string) {
  if (!value) return ink.muted;
  if (value.includes("Low bandwidth")) return ink.rose;
  if (value.includes("may stutter") || value.includes("may buffer")) return ink.orange;
  if (value.includes("unknown") || value.includes("SD")) return ink.yellow;
  return ink.blue;
}

function trace(x: number, y: number, width: number, title: string, samples: number[], color: string, height = 74) {
  const peak = samples.length ? Math.max(...samples) : undefined;
  return `${inset(x, y, width, height)}
${text(x + 8, y + 16, title, { size: 10, weight: 500, fill: ink.muted })}
${
  samples.length > 1
    ? sparkline(samples, { x: x + 8, y: y + 22, width: width - 16, height: height - 38 }, color, { glow: true })
    : text(x + width / 2, y + height / 2 + 6, "Waiting", { size: 10, fill: ink.muted, anchor: "middle" })
}
${text(x + 8, y + height - 6, peak != null ? `Peak ${peak.toFixed(1)} Mbps` : "—", { size: 9, fill: ink.muted })}`;
}

/** The app's SpeedTestView.context: " · Cloudflare FRA · 1 connection · Wi-Fi 5 GHz, −58 dBm · through WireGuard". */
function speedContext(result: SpeedTest) {
  const m = result.measurements;
  const c = m?.context as
    { kind?: string; band?: string; rssi?: number; vpn?: string; otherBytes?: number } | undefined;
  const parts: (string | undefined)[] = [
    m?.server,
    m?.streams ? (m.streams === 1 ? "1 connection" : `${m.streams} connections`) : undefined,
  ];
  if (c) {
    if (c.kind === "Wi-Fi" || c.band)
      parts.push(
        `${c.kind === "VPN" ? "over Wi-Fi" : "Wi-Fi"}${c.band ? ` ${c.band}` : ""}${c.rssi != null ? `, ${c.rssi} dBm` : ""}`,
      );
    else parts.push(c.kind);
    if (c.vpn) parts.push(`through ${c.vpn}`);
    if ((c.otherBytes ?? 0) >= 1_000_000) parts.push(`${formatBytes(c.otherBytes ?? 0)} other traffic`);
  }
  const shown = parts.filter(Boolean);
  return shown.length ? " · " + shown.join(" · ") : "";
}

/** Speed test in one screen: the app's dials with their traces, then readiness beside the details. */
export function speedCard(live: Live | undefined, result: SpeedTest | undefined, metered = false) {
  const m = result?.measurements;
  const running = !!live && !result;
  const progress = (phase: Phase) => {
    if (result) return 1;
    if (!live) return 0;
    if (live.phase === phase) return live.fraction;
    if (phase === "download" && (live.phase === "upload" || live.phase === "complete")) return 1;
    return 0;
  };
  const down = m?.downloadMbps ?? live?.down[live.down.length - 1];
  const up = m?.uploadMbps ?? live?.up[live.up.length - 1];

  // The test: each dial at 80 % of the app's size, its trace beside it.
  const status =
    running && live
      ? `${text(656, 24, phaseTitle[live.phase], { size: 10.5, weight: 500, fill: live.phase === "upload" ? ink.violet : ink.blue, anchor: "end" })}${text(688, 24, `${Math.round(live.elapsed)}s`, { size: 10, fill: ink.muted, anchor: "end", mono: true })}`
      : "";
  const dial = (x: number, title: string, value: number | undefined, phase: Phase, color: string) =>
    `<g transform="translate(${x} 30) scale(0.8)">${speedDial(0, 0, title, value, progress(phase), color, running && live?.phase === phase)}</g>`;
  let out = `${panel(0, 0, WIDE, 186)}
${text(12, 24, "Speed test", { size: 12, weight: 600 })}${status}
${dial(84, "Download", down, "download", ink.blue)}
${trace(168, 40, 172, "Download", live?.down ?? [], ink.blue, 132)}
${dial(434, "Upload", up, "upload", ink.violet)}
${trace(518, 40, 170, "Upload", live?.up ?? [], ink.violet, 132)}`;

  // What it's good for, beside the details.
  const top = 194;
  const panelAt = out.length;
  out += `<line x1="350" y1="${top + 12}" x2="350" y2="${top + 108}" stroke="${ink.ink}" stroke-opacity="${ink.stroke}"/>`;
  const ready: [string, keyof typeof icons, string | undefined][] = [
    ["Voice calls", "phone", result?.voiceCalls],
    ["Video calls", "video", result?.videoCalls],
    ["Streaming", "tv", result?.streaming],
    ["AI agents", "sparkles", result?.agents],
  ];
  let y = top + 26;
  for (const [title, icon, value] of ready) {
    const color =
      icon === "sparkles"
        ? value === "May stall"
          ? ink.rose
          : value === "Sluggish"
            ? ink.orange
            : value
              ? ink.blue
              : ink.muted
        : readinessColor(value);
    out += `${icons[icon](12, y - 12, color)}${text(36, y, title, { fill: ink.muted })}${text(338, y, fit(value ?? "Waiting", 170, 11), { fill: value ? ink.text : ink.muted, anchor: "end" })}`;
    y += 24;
  }

  y = top + 26;
  let footer = "",
    footerColor = ink.muted;
  if (result) {
    const baseline = (m as { baseline?: { samples?: number[]; lossPercent?: number } } | undefined)?.baseline;
    const idle = result.idleLatencyMs;
    const jit = result.jitterMs;
    const rows: [string, string, string?][] = [
      ["Idle latency", idle != null ? `${Math.round(idle)} ms` : "No reply"],
      ["Added under load", result.addedLatencyMs != null ? `+${Math.round(result.addedLatencyMs)} ms` : "Inconclusive"],
      [
        "Bufferbloat",
        result.bufferbloat ?? "—",
        result.bufferbloat === "High" ? ink.rose : result.bufferbloat === "Moderate" ? ink.orange : undefined,
      ],
      ["Transferred", m?.transferredBytes ? formatBytes(m.transferredBytes) : "—"],
    ];
    for (const [label, value, color] of rows) {
      out += row(362, y, 326, label, value, color);
      y += 24;
    }
    if (result.callWarnings?.length) {
      footer = result.callWarnings.join(" · ");
      footerColor = ink.orange;
    } else {
      footer =
        [
          jit != null ? `Jitter ${Math.round(jit)} ms` : undefined,
          baseline?.lossPercent != null ? `ping loss ${Math.round(baseline.lossPercent)}%` : undefined,
        ]
          .filter(Boolean)
          .join(" · ") + speedContext(result);
    }
  } else if (metered && !running) {
    out += text(362, y, "Metered network · a test uses up to 80 MB", { size: 10, fill: ink.rose });
    y += 20;
    for (const line of wrap(
      "A light test stays under 10 MB and still gives a good rough number. Press Return to run it, or pick the full test in Actions.",
      320,
      11,
      4,
    )) {
      out += text(362, y, line, { fill: ink.muted });
      y += 16;
    }
  } else {
    const note = running
      ? "Idle latency, bufferbloat and what this line is good for appear once both transfers finish."
      : "One HTTPS connection to Cloudflare's nearest data center, 8 seconds each way, at most 80 MB.";
    for (const line of wrap(note, 320, 11, 4)) {
      out += text(362, y, line, { fill: ink.muted });
      y += 16;
    }
  }
  if (footer) out += text(12, top + 130, fit(footer, 676, 10), { size: 10, fill: footerColor });
  const lower = footer ? 142 : 122;
  out = out.slice(0, panelAt) + panel(0, top, WIDE, lower) + out.slice(panelAt);
  return svg(WIDE, top + lower, out);
}

// Network status

export function statusCard(wifi: WiFi | undefined, c: Conditions, latencies: number[]) {
  const score = wifi?.score ?? 0;
  const scoreColor = score >= 60 ? ink.blue : score >= 35 ? ink.orange : ink.rose;

  let left = `${panel(0, 0, 344, 196)}${text(12, 24, "Wi-Fi", { size: 12, weight: 600 })}`;
  if (wifi?.powered && wifi.rssi != null) {
    const scoreText = String(Math.round(score));
    left += `${text(332, 24, fit(wifi.ssid ?? "Name hidden", 200, 11), { fill: wifi.ssid ? ink.text : ink.muted, anchor: "end" })}
${text(12, 66, scoreText, { size: 22, weight: 700 })}${text(12 + scoreText.length * 13.5 + 4, 66, "signal score", { size: 10, fill: ink.muted })}
${text(332, 66, score >= 60 ? "Good" : score >= 35 ? "Fair" : "Weak", { weight: 600, fill: scoreColor, anchor: "end" })}
${bar(12, 78, 320, score / 100, scoreColor)}
${row(12, 110, 320, "Band", [wifi.band, wifi.channel ? `channel ${wifi.channel}` : undefined].filter(Boolean).join(" · "))}
${row(12, 132, 320, "Link rate", wifi.transmitMbps ? `${wifi.transmitMbps} Mbps` : "—")}
${row(12, 154, 320, "Signal / noise", `${wifi.rssi} / ${wifi.noise} dBm`)}
${row(12, 176, 320, "Interface", wifi.interface ?? "—")}`;
  } else {
    left += `${text(12, 66, wifi?.powered === false ? "Off" : "Not connected", { size: 22, weight: 700 })}
${text(12, 90, c.connected ? `Online through ${c.network ?? "another connection"}` : "No network", { fill: ink.muted })}`;
  }

  const latency = c.internetLatencyMs;
  const loss = c.internetLossPercent ?? 0;
  const value = c.connected ? (latency != null ? String(Math.round(latency)) : "—") : "Offline";
  const latencyColor =
    !c.connected || loss >= 2 || (latency ?? 0) > 150 ? ink.rose : (latency ?? 0) > 80 ? ink.orange : ink.text;
  const history = latencies.slice(-40);
  const right = `${panel(356, 0, 344, 196)}${text(368, 24, "Internet", { size: 12, weight: 600 })}
${text(688, 24, c.connected ? `via ${c.network ?? "network"}${c.interface ? ` (${c.interface})` : ""}` : "", { fill: ink.muted, anchor: "end" })}
${text(368, 66, value, { size: 22, weight: 700, fill: latencyColor })}${c.connected && latency != null ? text(368 + value.length * 13.5 + 4, 66, "ms latency", { size: 10, fill: ink.muted }) : ""}
${text(688, 66, c.connected ? (loss > 0 ? `${loss}% loss` : "No loss") : "", { weight: 600, fill: loss > 0 ? ink.orange : ink.blue, anchor: "end" })}
${inset(368, 80, 320, 104)}
${history.length > 1 ? sparkline(history, { x: 376, y: 90, width: 304, height: 70 }, ink.blue, { ceiling: Math.max(...history) * 1.2 }) : text(528, 136, "Listening", { size: 10, fill: ink.muted, anchor: "middle" })}
${text(376, 177, "Live", { size: 9, fill: ink.muted })}
${history.length > 1 ? text(680, 177, `${Math.round(Math.min(...history))}–${Math.round(Math.max(...history))} ms`, { size: 9, fill: ink.muted, anchor: "end", mono: true }) : ""}`;

  const battery = c.power?.batteryPercent;
  const facts: [string, string, string?][] = [
    ["VPN", c.vpn ? (c.vpnName ?? "On") : "Off", c.vpn ? ink.violet : undefined],
    ["Data", c.metered ? "Metered" : c.lowDataMode ? "Low Data Mode" : "Unmetered", c.metered ? ink.orange : undefined],
    ["Keep awake", c.keptAwake ? "Awake" : "Can sleep", c.keptAwake ? ink.violet : undefined],
    [
      "Power",
      [c.power?.onAC ? "Plugged in" : "Battery", battery != null ? `${battery}%` : undefined]
        .filter(Boolean)
        .join(" · "),
      c.power && !c.power.onAC && (battery ?? 100) < 20 ? ink.rose : undefined,
    ],
  ];
  // The power tile already says when it's on battery.
  const advice = c.advice && !/^On battery at \d+%\.?$/.test(c.advice) ? c.advice : undefined;
  const height = advice ? 304 : 276;
  let bottom = panel(0, 208, 700, height - 208);
  facts.forEach(([label, factValue, color], index) => {
    const x = 12 + index * 172;
    bottom += `${text(x, 232, label, { size: 10, weight: 500, fill: ink.muted })}${text(x, 252, fit(factValue, 160, 13), { size: 13, weight: 600, fill: color ?? ink.text })}`;
  });
  if (advice) bottom += text(12, 286, fit(advice, 670, 11), { fill: ink.muted });
  return svg(WIDE, height, left + right + bottom);
}

// Why can't I reach

const stepColor = (status: string) =>
  status === "ok" ? ink.mint : status === "failed" ? ink.rose : status === "skipped" ? ink.muted : ink.orange;

/** The app's Tag: small semibold text on an 11 % tint of its color. */
const tag = (x: number, y: number, value: string, color: string) => {
  const width = value.length * 6.4 + 12;
  return `<rect x="${x - width}" y="${y - 12}" width="${width}" height="17" rx="6" fill="${color}" fill-opacity="0.11"/>${text(x - width / 2, y, value, { size: 10, weight: 600, fill: color, anchor: "middle" })}`;
};

export function whyCard(report: WhyReport) {
  const target = report.target.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const verdict = wrap(report.verdict, 660, 11, 2);
  const details = report.steps.map((step) => wrap(step.detail, 470, 11, 2));
  const next = !report.ok && report.next ? wrap(report.next, 660, 10.5, 3) : [];
  let y = 50 + verdict.length * 16 + 14;
  let rows = "";
  report.steps.forEach((step, index) => {
    const height = 10 + details[index].length * 15;
    const color = stepColor(step.status);
    if (step.status === "failed")
      rows += `<rect x="8" y="${y - 15}" width="684" height="${height + 6}" rx="7" fill="${ink.rose}" fill-opacity="0.08"/>`;
    rows += dot(20, y - 4, color, 3.5);
    rows += text(34, y, step.layer, { weight: 600, fill: step.status === "skipped" ? ink.muted : ink.text });
    details[index].forEach((line, lineIndex) => {
      rows += text(150, y + lineIndex * 15, line, { fill: step.status === "failed" ? ink.text : ink.muted });
    });
    const label =
      step.status === "ok"
        ? "OK"
        : step.status === "failed"
          ? "Failed"
          : step.status === "skipped"
            ? "Skipped"
            : "Check";
    rows += text(688, y, label, { size: 10, weight: 600, fill: color, anchor: "end" });
    y += height + 6;
  });
  let tail = "";
  if (next.length) {
    y += 6;
    tail += `<line x1="12" y1="${y - 12}" x2="688" y2="${y - 12}" stroke="${ink.ink}" stroke-opacity="${ink.stroke}"/>`;
    next.forEach((line, index) => (tail += text(12, y + 4 + index * 14, line, { size: 10.5, fill: ink.muted })));
    y += next.length * 14 + 4;
  }
  const height = y + 4;
  return svg(
    WIDE,
    height,
    `${panel(0, 0, 700, height)}
${text(12, 26, fit(target, 520, 12), { size: 12, weight: 600 })}
${tag(688, 26, report.ok ? "Reachable" : "Fails", report.ok ? ink.mint : ink.rose)}
${verdict.map((line, index) => text(12, 50 + index * 16, line, { fill: report.ok ? ink.text : ink.rose })).join("")}
${rows}${tail}`,
  );
}

const LAYERS = ["Network", "Interface", "Proxy", "DNS", "Kilobat rules", "IPv4", "IPv6", "Server"];

/** While `why` runs: the layers it walks, the current one lit. */
export function checkingCard(host: string, tick: number) {
  const lit = tick % LAYERS.length;
  const rows = LAYERS.map((layer, index) => {
    const y = 76 + index * 25;
    const color = index < lit ? ink.mint : index === lit ? ink.blue : ink.muted;
    return `${dot(20, y - 4, color, 3.5)}${text(34, y, layer, { weight: 600, fill: index <= lit ? ink.text : ink.muted })}${
      index === lit ? text(150, y, "Checking…", { fill: ink.blue }) : ""
    }`;
  }).join("");
  const height = 76 + LAYERS.length * 25 - 6;
  return svg(
    WIDE,
    height,
    `${panel(0, 0, 700, height)}${text(12, 26, fit(host, 520, 12), { size: 12, weight: 600 })}
${tag(688, 26, "Checking", ink.blue)}
${text(12, 50, "Every layer between this Mac and the server, in order.", { fill: ink.muted })}${rows}`,
  );
}

// Network apps

const split = (rate: string) => {
  const [number, ...unit] = rate.split(" ");
  return [number, unit.join(" ")];
};

/** One app's traffic, as the app's Download and Upload cards, then the processes inside it. */
export function appCard(app: NetworkApp, down: number[], up: number[]) {
  const ceiling = Math.max(1024, ...down, ...up);
  const metric = (x: number, title: "Download" | "Upload", rate: number, samples: number[], color: string) => {
    const [number, unit] = split(formatRate(rate));
    return `${panel(x, 58, 200, 128)}${icons[title === "Download" ? "down" : "up"](x + 10, 68, color)}
${text(x + 28, 79, title, { weight: 600, fill: ink.muted })}
${text(x + 12, 110, number, { size: 22, weight: 700 })}${text(x + 12 + number.length * 12.4 + 3, 110, unit, { size: 10, fill: ink.muted })}
${sparkline(samples, { x: x + 10, y: 122, width: 180, height: 44 }, color, { glow: true, root: true, ceiling })}`;
  };
  const members = [...(app.members ?? [])].sort(
    (a, b) =>
      b.downloadBytesPerSecond + b.uploadBytesPerSecond - (a.downloadBytesPerSecond + a.uploadBytesPerSecond) ||
      b.sessionBytes - a.sessionBytes,
  );
  const shown = members.slice(0, 6);
  const processCount = app.processIDs.length;
  const kind =
    app.id === "mac"
      ? "Every app and process"
      : members.length > 1
        ? `${members.length} helpers · ${processCount} process${processCount === 1 ? "" : "es"}`
        : app.id.startsWith("process:")
          ? `Process · PID ${app.processIDs.join(", ")}`
          : `${processCount} process${processCount === 1 ? "" : "es"}`;
  let y = 226;
  let list = row(12, y, 388, "Since Kilobat started watching", formatBytes(app.sessionBytes));
  if (shown.length > 1) {
    y += 14;
    list += `<line x1="12" y1="${y}" x2="400" y2="${y}" stroke="${ink.ink}" stroke-opacity="${ink.stroke}"/>`;
    y += 20;
    for (const member of shown) {
      const rate = member.downloadBytesPerSecond + member.uploadBytesPerSecond;
      list += `${text(12, y, fit(member.name, 210, 11))}${text(300, y, rate >= 1 ? formatRate(rate) : "Idle", { fill: rate >= 512 ? ink.blue : ink.muted, anchor: "end" })}${text(400, y, formatBytes(member.sessionBytes), { fill: ink.muted, anchor: "end" })}`;
      y += 20;
    }
    if (members.length > shown.length) {
      list += text(12, y, `and ${members.length - shown.length} more`, { size: 10, fill: ink.muted });
      y += 18;
    }
    y -= 6;
  }
  const height = y + 18;
  return svg(
    NARROW,
    height,
    `${text(2, 18, fit(app.name, 400, 13), { size: 13, weight: 600 })}
${text(2, 38, fit(kind, 410, 11), { fill: ink.muted })}
${metric(0, "Download", app.downloadBytesPerSecond, down, ink.blue)}
${metric(212, "Upload", app.uploadBytesPerSecond, up, ink.violet)}
${panel(0, 198, 412, height - 198)}${list}`,
  );
}

// Keep awake

export function awakeCard(
  title: string,
  headline: string,
  detail: string,
  state: { awake: boolean; reasons?: string; battery?: number; onAC?: boolean },
) {
  const lines = wrap(detail, 380, 11, 3);
  const rule = 84 + lines.length * 16;
  const height = rule + 84;
  let y = rule + 24;
  let rows = "";
  const facts: [string, string, string?][] = [
    ["Right now", state.awake ? "Awake" : "Can sleep", state.awake ? ink.violet : undefined],
    [
      "Power",
      state.onAC ? "Plugged in" : state.battery != null ? `Battery · ${state.battery}%` : "Battery",
      !state.onAC && (state.battery ?? 100) < 20 ? ink.rose : undefined,
    ],
    ["Held by", state.reasons ? fit(state.reasons, 220, 11) : "Nothing"],
  ];
  for (const [label, value, color] of facts) {
    rows += row(12, y, 388, label, value, color);
    y += 22;
  }
  return svg(
    NARROW,
    height,
    `${panel(0, 0, 412, height)}
${text(12, 26, title, { size: 12, weight: 600 })}
${text(12, 56, headline, { size: 22, weight: 700, fill: state.awake ? ink.violet : ink.text })}
${lines.map((line, index) => text(12, 76 + index * 16, line, { fill: ink.muted })).join("")}
<line x1="12" y1="${rule}" x2="400" y2="${rule}" stroke="${ink.ink}" stroke-opacity="${ink.stroke}"/>
${rows}`,
  );
}

// Notices: the metered warning, a missing CLI, errors and first loads, in the same panels.

type Tone = "info" | "warning" | "error";

/** A titled panel with a tag, a few lines of text and, optionally, a command to copy. */
export function noticeCard(
  title: string,
  body: string,
  {
    tone = "info",
    tagText,
    command,
    width = WIDE,
  }: { tone?: Tone; tagText?: string; command?: string; width?: number } = {},
) {
  const color = tone === "error" ? ink.rose : tone === "warning" ? ink.orange : ink.blue;
  const lines = body.split("\n").flatMap((paragraph) => (paragraph ? wrap(paragraph, width - 24, 11, 4) : [""]));
  let y = 52;
  let content = "";
  for (const line of lines) {
    if (line) content += text(12, y, line, { fill: ink.muted });
    y += line ? 16 : 8;
  }
  if (command) {
    y += 6;
    content += `${inset(12, y, width - 24, 34)}${text(24, y + 21, command, { size: 12, mono: true })}`;
    y += 34 + 4;
  }
  const height = y + 12;
  const label = tagText ?? (tone === "error" ? "Error" : tone === "warning" ? "Heads up" : "Kilobat");
  const tagWidth = label.length * 6.4 + 12;
  return svg(
    width,
    height,
    `${panel(0, 0, width, height)}${text(12, 26, fit(title, width - tagWidth - 40, 12), { size: 12, weight: 600 })}
<rect x="${width - 12 - tagWidth}" y="14" width="${tagWidth}" height="17" rx="6" fill="${color}" fill-opacity="0.11"/>${text(width - 12 - tagWidth / 2, 26, label, { size: 10, weight: 600, fill: color, anchor: "middle" })}
${content}`,
  );
}

/** Shown over the last reading when a refresh fails, so old numbers never pass for live ones. */
export function staleCard(error: Error, updated: Date | undefined, width = WIDE) {
  const when = updated
    ? updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "earlier";
  return noticeCard(
    "Not updating",
    `Kilobat stopped answering, so this is the reading from ${when}. It keeps trying.\n${error.message}`,
    {
      tone: "warning",
      tagText: "Stale",
      width,
    },
  );
}
