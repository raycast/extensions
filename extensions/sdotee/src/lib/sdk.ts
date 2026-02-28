import { getPreferenceValues } from "@raycast/api";
import { getUrlDomains, getTextDomains, getFileDomains } from "./api";

export interface Preferences {
  apiKey: string;
  baseUrl?: string;
  defaultUrlDomain?: string;
  defaultTextDomain?: string;
  defaultFileDomain?: string;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function getDefaultUrlDomain(): Promise<string> {
  const prefs = getPrefs();
  if (prefs.defaultUrlDomain) return prefs.defaultUrlDomain;
  const res = await getUrlDomains();
  return res.data.domains[0] || "";
}

export async function getDefaultTextDomain(): Promise<string> {
  const prefs = getPrefs();
  if (prefs.defaultTextDomain) return prefs.defaultTextDomain;
  const res = await getTextDomains();
  return res.data.domains[0] || "";
}

export async function getDefaultFileDomain(): Promise<string> {
  const prefs = getPrefs();
  if (prefs.defaultFileDomain) return prefs.defaultFileDomain;
  const res = await getFileDomains();
  return res.data.domains[0] || "";
}
