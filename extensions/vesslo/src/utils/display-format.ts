import { canAccessAppPath, AppPolicyContext } from "./app-policy";
import type { VessloApp } from "../types";

/** Exported text is data, including strings that resemble Markdown or bidi markup. */
export function displayText(
  value: string | null | undefined,
  maxLength = 240,
): string {
  const clean = (value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    // Invisible controls must not change the apparent identity or warning text.
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  const characters = Array.from(clean);
  const limit = Math.max(1, maxLength);
  return characters.length > limit
    ? `${characters.slice(0, limit - 1).join("")}…`
    : clean;
}

export function markdownText(
  value: string | null | undefined,
  maxLength = 1024,
): string {
  const text = displayText(value, maxLength);
  if (!text) return "";
  // Raycast autolinks decoded entities. A code span preserves the literal text;
  // its delimiter is longer than every run in the bounded, single-line value.
  const longestRun = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map((run) => run.length),
  );
  const delimiter = "`".repeat(longestRun + 1);
  const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${delimiter}${padding}${text}${padding}${delimiter}`;
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown (invalid date)";
  return `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

export function countLabel(
  count: number,
  singular = "app",
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function sourceLabel(value: string): string {
  switch (value.trim().toLowerCase().replace(/[ _-]/g, "")) {
    case "brew":
    case "homebrew":
      return "Homebrew";
    case "appstore":
    case "mas":
      return "App Store";
    case "sparkle":
      return "Sparkle";
    case "manual":
      return "Manual";
    default:
      return displayText(value, 80) || "Unknown";
  }
}

export function installedAppIconPath(
  app: Pick<VessloApp, "path" | "isDeleted">,
  context: AppPolicyContext,
): string | null {
  return canAccessAppPath(app, context) && /\.app\/?$/i.test(app.path)
    ? app.path
    : null;
}
