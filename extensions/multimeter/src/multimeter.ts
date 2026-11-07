import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getApplications, open, showToast, Toast } from "@raycast/api";

const run = promisify(execFile);

/** Bundle ids of the direct download and the Mac App Store builds. */
const BUNDLE_IDS = ["com.greatwork.Multimeter", "com.greatwork.Multimeter.appstore"];

export const DOWNLOAD_URL = "https://multimeterapp.com";

export interface SetParams {
  key: string;
  value: string;
  min?: string;
  max?: string;
  label?: string;
  unit?: string;
}

/** Builds a multimeter://set link. Empty optional fields are left out. */
export function setLink(params: SetParams): string {
  const query = new URLSearchParams();
  query.set("key", params.key.trim());
  query.set("value", params.value.trim());
  for (const name of ["min", "max", "label", "unit"] as const) {
    const v = params[name]?.trim();
    if (v) query.set(name, v);
  }
  // URLSearchParams encodes spaces as "+"; Multimeter reads query items with
  // URLComponents, which expects %20.
  return `multimeter://set?${query.toString().replace(/\+/g, "%20")}`;
}

export function isNumber(text: string | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed));
}

/** True if either Multimeter build is installed. Shows a toast with a download action if not. */
export async function ensureInstalled(): Promise<boolean> {
  const apps = await getApplications();
  if (apps.some((app) => app.bundleId && BUNDLE_IDS.includes(app.bundleId))) return true;
  await showToast({
    style: Toast.Style.Failure,
    title: "Multimeter isn't installed",
    message: "Get it at multimeterapp.com",
    primaryAction: { title: "Open multimeterapp.com", onAction: () => open(DOWNLOAD_URL) },
  });
  return false;
}

/** Opens a multimeter:// link. `background` keeps Multimeter from coming forward (open -g). */
export async function openLink(link: string, background: boolean): Promise<void> {
  await run("/usr/bin/open", background ? ["-g", link] : [link]);
}
