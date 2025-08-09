import { environment } from "@raycast/api";
import enStrings from "./en.json";

type LocaleStrings = typeof enStrings;

export function getLocalizedStrings(): LocaleStrings {
  const locale = (environment as { locale?: string }).locale || "en";
  const languageCode = locale.split("-")[0];

  try {
    if (languageCode === "ko") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const koStrings = require("./ko.json");
      return koStrings;
    }
    return enStrings;
  } catch {
    return enStrings;
  }
}

export type { LocaleStrings };
