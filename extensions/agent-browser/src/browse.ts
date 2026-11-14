import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";

import { runAgentBrowser } from "./lib/agent-browser";

export default async function Browse(props: LaunchProps<{ arguments: Arguments.Browse }>) {
  const { url, session, profile } = props.arguments;
  try {
    await runAgentBrowser(["open", normalizeUrl(url)], {
      session,
      profile,
      initializeSession: true,
      globalArguments: ["--headed"],
    });
    await showHUD("Opened in Agent Browser");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open in Agent Browser",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function normalizeUrl(value: string): string {
  const url = value.trim();
  if (!url) throw new Error("Enter a URL to open.");
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
