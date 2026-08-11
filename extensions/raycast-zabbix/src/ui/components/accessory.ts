import { Icon, List } from "@raycast/api";

export function GetProblemDuration(clock: number): string {
  const timeProblem = new Date(clock * 1000);
  const timeNow = new Date();

  const diff = Math.max(0, timeNow.getTime() - timeProblem.getTime());
  if (!Number.isFinite(diff) || diff <= 0) return "0s";

  let seconds = Math.floor(diff / 1000);
  let minutes = Math.floor(seconds / 60);
  seconds %= 60;
  let hours = Math.floor(minutes / 60);
  minutes %= 60;
  let days = Math.floor(hours / 24);
  hours %= 24;
  let months = 0;
  let years = 0;

  /* Approximate months/years from days (best-effort, no full calendar math) */
  if (days >= 30) {
    months = Math.floor(days / 30);
    days %= 30;
  }
  if (months >= 12) {
    years = Math.floor(months / 12);
    months %= 12;
  }

  let output = "";
  if (years > 0) output += `${years}y, `;
  if (months > 0) output += `${months}M, `;
  if (days > 0) output += `${days}d, `;
  if (hours > 0 && years === 0) output += `${hours}h, `;
  if (minutes > 0 && months + years === 0) output += `${minutes}m, `;
  if (seconds > 0 && hours + days + months + years === 0)
    output += `${seconds}s, `;
  const trimmed = output.slice(0, -2);
  return trimmed || "0s";
}

export function GetAccessorySeverity(
  severity: number,
  value: string,
): List.Item.Accessory | undefined {
  const accessory: List.Item.Accessory[] = [
    {
      tag: { value: value, color: { light: "#97AAB3", dark: "#97AAB3" } },
      icon: Icon.Info,
      tooltip: "Not Classified",
    },
    {
      tag: { value: value, color: { light: "#7499FF", dark: "#7499FF" } },
      icon: Icon.Info,
      tooltip: "Information",
    },
    {
      tag: { value: value, color: { light: "#FFC859", dark: "#FFC859" } },
      icon: Icon.Warning,
      tooltip: "Warning",
    },
    {
      tag: { value: value, color: { light: "#FFA059", dark: "#FFA059" } },
      icon: Icon.Warning,
      tooltip: "Average",
    },
    {
      tag: { value: value, color: { light: "#E9765A", dark: "#E9765A" } },
      icon: Icon.XMarkCircle,
      tooltip: "High",
    },
    {
      tag: { value: value, color: { light: "#E45959", dark: "#E45959" } },
      icon: Icon.XMarkCircle,
      tooltip: "Disaster",
    },
  ];
  return accessory.at(severity);
}
