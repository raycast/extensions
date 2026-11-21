import { closeMainWindow, showHUD } from "@raycast/api";
import { jumpTo } from "./terminal";
import { cleanName, listAgents } from "./tuios";

export default async function Command() {
  try {
    // Oldest wait first: it has been blocked the longest.
    const waiting = (await listAgents())
      .filter((a) => a.state === "needs_input")
      .sort((x, y) => x.agent_state_at - y.agent_state_at);
    if (!waiting.length) {
      await showHUD("Nothing is waiting on you");
      return;
    }
    const a = waiting[0];
    await closeMainWindow();
    const app = await jumpTo(a);
    const more = waiting.length > 1 ? ` (+${waiting.length - 1} more)` : "";
    await showHUD(`${cleanName(a.name)} · ${app}${more}`);
  } catch (e) {
    await showHUD(`tuios: ${e instanceof Error ? e.message : String(e)}`);
  }
}
