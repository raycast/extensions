import { runAppleScript } from "@raycast/utils";
import { ccSLDs } from "./ccslds";

const getFrontmostApp = () => {
  return runAppleScript(`
      tell application "System Events"
        set frontmostApp to name of first application process whose frontmost is true
        return frontmostApp
      end tell
      `);
};

const getSafariURL = () => {
  return runAppleScript(`
    tell application "Safari" to get URL of front document
  `);
};

const getChromiumURL = (browser = "Google Chrome") => {
  return runAppleScript(`
    tell application "${browser}"
      set currentTab to active tab of front window
      set currentURL to URL of currentTab
      return currentURL
    end tell
  `);
};

const getArcURL = () => {
  return runAppleScript(`
  tell application "Arc"
    tell front window
      get the URL of active tab
    end tell
  end tell
  `);
};

const chromiumBrowsers = ["Google Chrome", "Opera", "Brave Browser", "Microsoft Edge", "Vivaldi"];

export const getURL = async () => {
  const browser = await getFrontmostApp();

  if (browser.match(/Safari/i)) {
    return getSafariURL();
  } else if (chromiumBrowsers.some((b) => browser.startsWith(b))) {
    return getChromiumURL(browser);
  } else if (browser.match(/Arc/i)) {
    return getArcURL();
  }

  throw new Error(`Application ${browser} not supported`);
};

export interface ParsedInput {
  isIp?: boolean;
  isDomain?: boolean;
  input?: string;
}

export const getBaseDomain = (hostname: string): string => {
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname) || hostname.includes(":")) {
    return hostname;
  }

  const parts = hostname.split(".");
  if (parts.length <= 2) {
    return hostname;
  }

  const last = parts[parts.length - 1].toLowerCase();
  const penultimate = parts[parts.length - 2].toLowerCase();

  if (last.length === 2 && ccSLDs[last]?.has(penultimate)) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
};

export const cleanInput = (domainOrIp: string): string => {
  let cleaned = domainOrIp.trim();
  if (!cleaned) return "";

  if (cleaned.startsWith("//")) {
    cleaned = "http:" + cleaned;
  } else if (!/^[a-zA-Z]+:\/\//.test(cleaned)) {
    cleaned = "http://" + cleaned;
  }

  try {
    const url = new URL(cleaned);
    let hostname = url.hostname;
    hostname = hostname.replace(/^www\./i, "");
    return getBaseDomain(hostname);
  } catch {
    let fallback = domainOrIp
      .trim()
      .replace(/^[a-zA-Z]+:\/\//i, "")
      .replace(/^www\./i, "");
    fallback = fallback.split(/[/?#]/)[0];
    return getBaseDomain(fallback);
  }
};

export const parseDomain = (domainOrIp: string): ParsedInput => {
  const cleaned = cleanInput(domainOrIp);
  const isIp = cleaned ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleaned) : false;
  const isDomain = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(cleaned);
  return { isIp, isDomain, input: cleaned };
};
