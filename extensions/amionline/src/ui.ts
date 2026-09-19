import { Icon, Color } from "@raycast/api";
import { CheckReport, LayerStatus, Verdict, VERDICT_META } from "./types";

export function verdictColor(verdict: Verdict): Color {
  switch (VERDICT_META[verdict].color) {
    case "Green":
      return Color.Green;
    case "Yellow":
      return Color.Yellow;
    case "Orange":
      return Color.Orange;
    case "Red":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function statusIcon(s: LayerStatus): Icon {
  switch (s) {
    case "ok":
      return Icon.CheckCircle;
    case "warn":
      return Icon.Warning;
    case "fail":
      return Icon.XMarkCircle;
    case "info":
      return Icon.Info;
    case "checking":
      return Icon.Circle;
    default:
      return Icon.Minus;
  }
}

export function statusColor(s: LayerStatus): Color {
  switch (s) {
    case "ok":
      return Color.Green;
    case "warn":
      return Color.Orange;
    case "fail":
      return Color.Red;
    case "info":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

export function diagnostics(r: CheckReport | undefined): string {
  if (!r) return "Am I Online: no result yet";
  const lines = [
    `Am I Online: ${VERDICT_META[r.verdict].title}`,
    `checked: ${new Date(r.checkedAt).toLocaleString()}`,
    `reason: ${r.reason}`,
  ];
  if (r.egressIp) lines.push(`public IP: ${r.egressIp}`);
  lines.push("");
  for (const l of r.layers) {
    const lat = l.latencyMs != null ? ` (${Math.round(l.latencyMs)}ms)` : "";
    const detail = l.detail ? `, ${l.detail}` : "";
    lines.push(`[${l.status.toUpperCase()}] ${l.label}${lat}${detail}`);
  }
  return lines.join("\n");
}
