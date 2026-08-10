import { MeetError } from "../errors";
import type { SupportedBrowsers } from "../utils/scripts";
import { createArcFamilyAdapter } from "./arc";
import { createChromiumAdapter } from "./chromium";
import { createFirefoxFamilyAdapter } from "./firefox";
import { createSafariAdapter } from "./safari";
import type { MeetingUrlSource } from "./types";

export function getAdapterForBrowser(browserName: SupportedBrowsers): MeetingUrlSource {
  switch (browserName) {
    case "Safari":
      return createSafariAdapter();
    case "Arc":
    case "Dia":
      return createArcFamilyAdapter(browserName);
    case "Firefox":
    case "Firefox Developer Edition":
    case "Mozilla Firefox":
    case "Zen":
      return createFirefoxFamilyAdapter(browserName);
    case "Google Chrome":
    case "Brave Browser":
    case "Microsoft Edge":
    case "Opera":
    case "QQ":
    case "Sogou Explorer":
    case "Vivaldi":
    case "Yandex":
      return createChromiumAdapter(browserName);
    default: {
      const unsupportedBrowser: never = browserName;
      throw new MeetError("UNSUPPORTED_BROWSER", { message: `"${unsupportedBrowser}" isn't a supported browser.` });
    }
  }
}

export type { MeetingUrlSource } from "./types";
