import { closeMainWindow, open, popToRoot } from "@raycast/api";
import { SupportedBrowsers } from "../interfaces";

export async function openNewTab(browser: SupportedBrowsers, url: string): Promise<void> {
  let appName = "";
  switch (browser) {
    case SupportedBrowsers.Chrome:
      appName = "Google Chrome";
      break;
    case SupportedBrowsers.Firefox:
      appName = "Firefox";
      break;
    case SupportedBrowsers.Safari:
      appName = "Safari";
      break;
    case SupportedBrowsers.Edge:
      appName = "Microsoft Edge";
      break;
    case SupportedBrowsers.Brave:
      appName = "Brave Browser";
      break;
    case SupportedBrowsers.Vivaldi:
      appName = "Vivaldi";
      break;
    case SupportedBrowsers.Arc:
      appName = "Arc";
      break;
    case SupportedBrowsers.Opera:
      appName = "Opera";
      break;
    case SupportedBrowsers.Iridium:
      appName = "Iridium";
      break;
    case SupportedBrowsers.Orion:
      appName = "Orion";
      break;
    case SupportedBrowsers.Sidekick:
      appName = "Sidekick";
      break;
    case SupportedBrowsers.Dia:
      appName = "Dia";
      break;
    case SupportedBrowsers.Comet:
      appName = "Comet";
      break;
    case SupportedBrowsers.ChatGPTAtlas:
      appName = "ChatGPT Atlas";
      break;
    default:
      throw new Error(`Unsupported browser: ${browser}`);
  }

  popToRoot();
  closeMainWindow({ clearRootSearch: true });
  await open(url, appName);
}
