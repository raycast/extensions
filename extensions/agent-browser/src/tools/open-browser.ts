import { getPreferenceValues } from "@raycast/api";

import { runAgentBrowser } from "../lib/agent-browser";

type Input = {
  /** HTTP or HTTPS URL to open. Include the full URL when possible. */
  url: string;
  /** Isolated browser session name. Reuse the same name for all steps in one task. Defaults to "raycast". */
  session?: string;
  /** Browser profile or Dia space name. Overrides the extension preference for this session. */
  profile?: string;
};

/** Opens a page in an agent-browser session. Dia results report whether native page inspection and interaction are ready. */
export default async function openBrowser(input: Input) {
  const url = normalizeUrl(input.url);
  const { showBrowserWindow } = getPreferenceValues<Preferences>();
  return runAgentBrowser(["open", url], {
    session: input.session,
    profile: input.profile,
    initializeSession: true,
    globalArguments: showBrowserWindow !== false ? ["--headed"] : [],
  });
}

function normalizeUrl(value: string): string {
  const url = value.trim();
  if (!url) throw new Error("A URL is required.");
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
