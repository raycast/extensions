import { homedir } from "os";
import { join } from "path";
import { Browser } from "./types";

const HOME = homedir();
const APP_SUPPORT = join(HOME, "Library", "Application Support");

export const BROWSERS: Browser[] = [
  {
    id: "chrome",
    name: "Google Chrome",
    bundleId: "com.google.Chrome",
    applicationPath: "/Applications/Google Chrome.app",
    profileRootPath: join(APP_SUPPORT, "Google", "Chrome"),
    icon: "chrome.png",
    processName: "Google Chrome",
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    bundleId: "com.microsoft.edgemac",
    applicationPath: "/Applications/Microsoft Edge.app",
    profileRootPath: join(APP_SUPPORT, "Microsoft Edge"),
    icon: "edge.png",
    processName: "Microsoft Edge",
  },
  {
    id: "brave",
    name: "Brave Browser",
    bundleId: "com.brave.Browser",
    applicationPath: "/Applications/Brave Browser.app",
    profileRootPath: join(APP_SUPPORT, "BraveSoftware", "Brave-Browser"),
    icon: "brave.png",
    processName: "Brave Browser",
  },
  {
    id: "arc",
    name: "Arc",
    bundleId: "company.thebrowser.Browser",
    applicationPath: "/Applications/Arc.app",
    profileRootPath: join(APP_SUPPORT, "Arc", "User Data"),
    icon: "arc.png",
    processName: "Arc",
  },
  {
    id: "vivaldi",
    name: "Vivaldi",
    bundleId: "com.vivaldi.Vivaldi",
    applicationPath: "/Applications/Vivaldi.app",
    profileRootPath: join(APP_SUPPORT, "Vivaldi"),
    icon: "vivaldi.png",
    processName: "Vivaldi",
  },
];

export function getBrowserById(id: string): Browser | undefined {
  return BROWSERS.find((b) => b.id === id);
}
