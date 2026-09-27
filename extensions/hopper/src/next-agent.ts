import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { jumpToAgent } from "./lib/agents/load";
import { LAST_NEXT_KEY, nextAgent, STATUS_TITLE } from "./lib/agents/status";
import { loadAllAgents } from "./lib/platform/agents";
import { activateApp } from "./lib/platform/macos";
import { macosPlatform } from "./lib/platform/os";

/** Jump to the agent that has waited longest for you: blocked first, then done. Run again for the next one. */
export default async function Command() {
  // Before activating anything, or Raycast restores focus and undoes the jump (ADR-004).
  await closeMainWindow();
  try {
    const { agents } = await loadAllAgents();
    const last = await macosPlatform.loadJson<string | undefined>(LAST_NEXT_KEY, undefined);
    const agent = nextAgent(agents, last);
    if (!agent) {
      await showHUD("No agents need you");
      return;
    }
    await macosPlatform.saveJson(LAST_NEXT_KEY, agent.key);
    await activateApp(await jumpToAgent(agent, macosPlatform, Date.now()));
    await showHUD(`${agent.statusDetail ?? STATUS_TITLE[agent.status]}: ${agent.title}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not jump to the next agent" });
  }
}
