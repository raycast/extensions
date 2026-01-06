import { randomUUID } from "crypto";

export function parsePlaceholders(content: string): string[] {
  // Supports both {{var}} and {var}
  const regex = /\{{1,2}(.*?)\}{1,2}/g;
  const matches = [...content.matchAll(regex)];
  return Array.from(new Set(matches.map((m) => m[1].trim())));
}

export function replacePlaceholders(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    // Escape for regex and handle both {{key}} and {key}
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\{{1,2}\\s*${escapedKey}\\s*\\}{1,2}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}

export function processOfficialPlaceholders(
  content: string,
  clipboardText: string,
  argument: string = "",
): string {
  let result = content;
  const now = new Date();

  // Date/Time placeholders
  result = result.replace(/{date}/g, () => now.toLocaleDateString());
  result = result.replace(/{time}/g, () => now.toLocaleTimeString());
  result = result.replace(/{datetime}/g, () => now.toLocaleString());
  result = result.replace(/{year}/g, () => now.getFullYear().toString());
  result = result.replace(/{month}/g, () =>
    (now.getMonth() + 1).toString().padStart(2, "0"),
  );
  result = result.replace(/{day}/g, () =>
    now.getDate().toString().padStart(2, "0"),
  );

  result = result.replace(/{monthName}/g, () =>
    now.toLocaleString("default", { month: "long" }),
  );
  result = result.replace(/{dayName}/g, () =>
    now.toLocaleString("default", { weekday: "long" }),
  );

  // Clipboard placeholder
  result = result.replace(/{clipboard}/g, () => clipboardText);

  // Argument placeholder
  result = result.replace(/{argument}/g, () => argument);

  // UUID placeholder
  result = result.replace(/{uuid}/g, () => randomUUID());

  // Cursor placeholder (remove it as we can't position cursor yet, but we shouldn't print the tag)
  result = result.replace(/{cursor}/g, "");

  return result;
}
