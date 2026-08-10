/**
 * Utilities for parsing disk data from diskutil output
 * Only responsible for parsing strings, not creating objects
 */
export class DiskParser {
  /**
   * Parse plain text diskutil info output to dictionary
   */
  static parseTextToDict(text: string): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    const regex = /(.+): +(.+$)|(.+)/gm;

    for (const match of text.matchAll(regex)) {
      if (match[1] && match[2]) {
        // for normal key-value pairs
        const key = match[1].trim();
        const value = match[2].trim();
        result[key] = value;
      } else if (match[3]) {
        // for headings
        result[match[3].trim()] = null;
      }
    }

    return result;
  }

  /**
   * Parse diskutil list line to extract disk data
   * Captures info from eg: "   0: Apple_APFS Container disk3         500.0 GB   disk0s2"
   * Returns parsed data object or null if parse fails
   */
  static parseStringToData(string: string): {
    number: number;
    type: string;
    identifier: string;
    name: string;
    size: string;
  } | null {
    string = string.replace(/⁨|⁩/g, "");
    const regex = /^ +(\d+):(.{27}) (.{21}.*?)([\\+|\d].+B)(.+)$/gm;
    const matches = string.matchAll(regex);

    for (const match of matches) {
      return {
        number: parseInt(match[1]),
        type: match[2].trim(),
        identifier: match[5].trim(),
        name: match[3].trim(),
        size: match[4].trim(),
      };
    }

    return null;
  }
}
