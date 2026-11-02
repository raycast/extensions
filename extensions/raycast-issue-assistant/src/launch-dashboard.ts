import { Clipboard, LaunchType, launchCommand, open } from "@raycast/api";
import { getAccessToken } from "@raycast/utils";

export default async function Command() {
  const { token } = getAccessToken();
  const clipboard = await Clipboard.readText();
  await launchCommand({ name: "search-issues", type: LaunchType.UserInitiated, arguments: { query: clipboard.trim() } });
  await open(`raycast://extensions/0xdhrv/issue-assistant/recent-issues?token=${token}`);
}
