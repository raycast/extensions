import { Tool } from "@raycast/api";

import { normalizeSession, runAgentBrowser } from "../lib/agent-browser";
import { clearBrowserSessionContext } from "../lib/browser-session";

type Input = {
  /** Browser session to close. Defaults to "raycast". */
  session?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Close this Agent Browser session? Its transient tabs and page state will be discarded.",
  info: [{ name: "Session", value: normalizeSession(input.session) }],
});

/** Closes one agent-browser session and discards its transient browser state. */
export default async function closeBrowser(input: Input) {
  const result = await runAgentBrowser(["close"], { session: input.session });
  await clearBrowserSessionContext(input.session);
  return result;
}
