import {
  Alert,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { detectDanger } from "../lib/danger";
import { expandPath } from "../lib/library";
import { shellQuote } from "../lib/parser";
import { preferredTerminal } from "../lib/store";
import { runInTerminal } from "../lib/terminal";
import type { SavedCommand } from "../lib/types";
import RunOutput from "./RunOutput";

type PushFn = ReturnType<typeof useNavigation>["push"];

export interface PerformRunOptions {
  command: SavedCommand;
  resolved: string;
  push: PushFn;
  onWillRun?: () => void;
}

export async function performRun(options: PerformRunOptions): Promise<void> {
  const { command, resolved, push, onWillRun } = options;

  const danger = detectDanger(resolved);
  if (danger) {
    const confirmed = await confirmAlert({
      title: "Run dangerous command?",
      message: `Detected: ${danger.label}\n\n${resolved}`,
      primaryAction: { title: "Run", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
  }

  onWillRun?.();

  const hasCwd = command.cwd !== undefined && command.cwd !== "";
  const cwd = expandPath(
    hasCwd && command.cwd !== undefined ? command.cwd : "~",
  );

  if (command.runMode === "terminal") {
    const finalCommand = hasCwd
      ? `cd ${shellQuote(cwd)} && ${resolved}`
      : resolved;
    const terminal = preferredTerminal();
    try {
      await closeMainWindow();
      await runInTerminal(finalCommand, terminal);
      await showHUD(`Sent to ${terminal === "iTerm" ? "iTerm2" : "Terminal"}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Terminal handoff failed",
        message: String(error),
      });
    }
    return;
  }

  push(<RunOutput title={command.name} command={resolved} cwd={cwd} />);
}
