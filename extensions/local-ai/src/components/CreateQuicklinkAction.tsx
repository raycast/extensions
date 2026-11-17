import { Action, Keyboard } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import type { RunCommandLaunchContext } from "../lib/launch-context";
import type { AiCommand } from "../lib/commands/types";
import { commandIcon } from "./command-icon";

export function CreateQuicklinkAction(props: { command: AiCommand }) {
  const context: RunCommandLaunchContext = { commandId: props.command.id };
  return (
    <Action.CreateQuicklink
      title="Create Quicklink"
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" } satisfies Keyboard.Shortcut}
      quicklink={{
        name: props.command.name,
        link: createDeeplink({ command: "run-command", context }),
        icon: commandIcon(props.command),
      }}
    />
  );
}
