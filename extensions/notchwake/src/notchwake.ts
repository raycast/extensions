import { open, showHUD, showToast, Toast } from "@raycast/api";

const BUNDLE_ID = "com.smk.notchwake";

/** Opens a notchwake:// URL. The app validates every value; this only builds the URL. */
export async function run(path: string, params: Record<string, string> = {}, hud?: string) {
  const query = new URLSearchParams(params).toString();
  try {
    await open(`notchwake://${path}${query ? `?${query}` : ""}`, BUNDLE_ID);
    if (hud) await showHUD(hud);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Notchwake isn't installed",
      message: "Get it at notchwake.com",
    });
  }
}

/** Whole minutes inside the range the app accepts, or undefined. */
export function minutes(raw: string, max: number): number | undefined {
  const value = raw.trim();
  if (!/^\d{1,6}$/.test(value)) return undefined;
  const n = Number(value);
  return n >= 1 && n <= max ? n : undefined;
}

export async function invalid(message: string) {
  await showToast({ style: Toast.Style.Failure, title: "Invalid value", message });
}
