import { Color, Icon } from "@raycast/api";

export const ohdearUrl = "https://ohdear.app";

export const checks = [
  { label: "Uptime", value: "uptime" },
  { label: "Performance", value: "performance" },
  { label: "Certificate Health", value: "certificate_health" },
  { label: "Broken Links", value: "broken_links" },
  { label: "Mixed Content", value: "mixed_content" },
  { label: "Application Health", value: "application_health" },
  { label: "Scheduled Tasks", value: "cron" },
  { label: "Certificate Transparency", value: "certificate_transparency" },
  { label: "DNS", value: "dns" },
  { label: "Domain", value: "domain" },
];

export const icons = {
  succeeded: { value: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Success" },
  warning: { value: { source: Icon.ExclamationMark, tintColor: Color.Orange }, tooltip: "Warning" },
  failed: { value: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: "Error" },
};

export function statusCodeToColor(status: string): Color {
  switch (status[0]) {
    case "1":
      return Color.Blue;
    case "2":
      return Color.Green;
    case "3":
      return Color.Yellow;
    case "4":
      return Color.Orange;
    case "5":
      return Color.Red;
    default:
      return Color.Magenta;
  }
}

export const checkStatuses = {
  succeeded: "🟢",
  pending: "🟡",
  warning: "🟠",
  failed: "🔴",
  erroredOrTimedOut: "🔴",
} as { [key: string]: string };

export const errorMessages = {
  'You have reached the trial site limit. Please <a href="https://ohdear.app/team-settings/manage-plan">subscribe</a> to a plan to add more sites.':
    "You have reached the trial site limit, subscribe to add more.",
} as { [key: string]: string };
