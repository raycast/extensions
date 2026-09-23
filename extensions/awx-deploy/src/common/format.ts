import { Color, Icon } from "@raycast/api";

export function statusColor(status?: string): Color {
  switch (status) {
    case "successful":
      return Color.Green;
    case "failed":
    case "error":
    case "canceled":
      return Color.Red;
    case "running":
      return Color.Blue;
    case "pending":
    case "waiting":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

export function statusIcon(status?: string): Icon {
  switch (status) {
    case "successful":
      return Icon.CheckCircle;
    case "failed":
    case "error":
      return Icon.XMarkCircle;
    case "canceled":
      return Icon.MinusCircle;
    case "running":
      return Icon.CircleProgress;
    case "pending":
    case "waiting":
      return Icon.Clock;
    default:
      return Icon.Circle;
  }
}

export function formatElapsed(seconds: number): string {
  if (!seconds) return "0s";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
