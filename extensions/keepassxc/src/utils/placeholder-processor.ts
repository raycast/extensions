import { getTOTPCode } from "./totp";

interface KeePassEntry {
  group: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  totp: string;
}

/**
 * Converts a string array from KeePassXC CLI to a KeePassEntry object
 *
 * @param entry - The string array from KeePassXC CLI export
 * @returns {KeePassEntry} The KeePassEntry object
 */
function arrayToEntry(entry: string[]): KeePassEntry {
  return {
    group: entry[0] || "",
    title: entry[1] || "",
    username: entry[2] || "",
    password: entry[3] || "",
    url: entry[4] || "",
    notes: entry[5] || "",
    totp: entry[6] || "",
  };
}

/**
 * Processes placeholders in a string according to KeePassXC placeholder syntax
 *
 * @param text - The text containing placeholders
 * @param entry - The KeePass entry data for placeholder resolution
 * @returns {string} The processed text with placeholders replaced
 */
function processPlaceholders(text: string, entry: KeePassEntry): string {
  if (!text) return text;

  text = text.replace(/{TITLE}/g, entry.title);
  text = text.replace(/{USERNAME}/g, entry.username);
  text = text.replace(/{PASSWORD}/g, entry.password);
  text = text.replace(/{URL}/g, entry.url);
  text = text.replace(/{NOTES}/g, entry.notes);

  // Only process TOTP if the entry has a TOTP URL
  if (entry.totp) {
    const code = (() => {
      try {
        return getTOTPCode(entry.totp);
      } catch {
        return null;
      }
    })();
    if (code) text = text.replace(/{TOTP}/g, code);
  }

  return text;
}

export { arrayToEntry, processPlaceholders };
