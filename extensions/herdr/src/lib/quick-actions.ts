import { closeMainWindow, popToRoot } from "@raycast/api";
import { focusResource, getAgentTarget, getSnapshot, runHerdr } from "./herdr";
import { launchHerdrInTerminal, revealFocusedHerdr } from "./terminal";
import { runAction } from "./ui";

export async function openHerdr(): Promise<void> {
  const ok = await runAction("Opening Herdr", () => launchHerdrInTerminal(), { success: "Herdr Opened" });
  if (ok) await closeMainWindow({ clearRootSearch: true });
}

export async function focusAttention(): Promise<void> {
  const ok = await runAction(
    "Finding an agent",
    async () => {
      const snapshot = await getSnapshot();
      const agent =
        snapshot.agents.find((item) => item.agent_status === "blocked") ||
        snapshot.agents.find((item) => item.agent_status === "done");
      if (!agent) throw new Error("No agent currently needs attention");
      await focusResource("agent", getAgentTarget(agent));
      await revealFocusedHerdr();
    },
    { success: "Agent Focused" },
  );
  if (ok) await closeMainWindow({ clearRootSearch: true });
}

export async function quickHerdrAction(args: string[], title: string, success: string): Promise<void> {
  const ok = await runAction(title, () => runHerdr(args).then(() => undefined), { success });
  if (ok) {
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow({ clearRootSearch: true });
  }
}
