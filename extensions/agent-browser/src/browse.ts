import { LaunchProps, showHUD } from "@raycast/api";

import { runAgentBrowser } from "./lib/agent-browser";

export default async function Browse(props: LaunchProps<{ arguments: Arguments.Browse }>) {
  const { url, session, profile } = props.arguments;
  await runAgentBrowser(["open", normalizeUrl(url)], {
    session,
    profile,
    initializeSession: true,
    globalArguments: ["--headed"],
  });
  await showHUD("Opened in Agent Browser");
}

function normalizeUrl(value: string): string {
  const url = value.trim();
  if (!url) throw new Error("Enter a URL to open.");
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
