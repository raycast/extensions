import { getApplications, open } from "@raycast/api";

/** The DevTools app's bundle identifier and URL scheme. */
export const BUNDLE_ID = "com.meshaon.devtoolsapp";
export const SCHEME = "devtoolsapp";
export const DOWNLOAD_URL = "https://github.com/me-shaon/devtools/releases/latest";

export const toolLink = (toolId: string) => `${SCHEME}://open/${encodeURIComponent(toolId)}`;
export const searchLink = (query: string) => `${SCHEME}://search?q=${encodeURIComponent(query)}`;

/** True when DevTools is installed. Raycast cannot open devtoolsapp:// links without it. */
export async function isDevToolsInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some((application) => application.bundleId === BUNDLE_ID);
}

/** Opens a devtoolsapp:// link. DevTools starts if it is not running. */
export async function openLink(link: string): Promise<void> {
  await open(link);
}
