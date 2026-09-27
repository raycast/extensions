export const BROWSER_SETTINGS_URL = "https://www.happy-squid.com/settings";

export function isBrowserSettingsUrl(address: string): boolean {
  try {
    const url = new URL(address);
    return (
      (url.origin === new URL(BROWSER_SETTINGS_URL).origin || url.origin === "https://happy-squid.com") &&
      (url.pathname === "/settings" || url.pathname === "/settings/")
    );
  } catch {
    return false;
  }
}
