import { Alert, confirmAlert } from "@raycast/api";
import { Shell } from "../types/shell";
import { getAlacrittyPreferences } from "../utils/get-alacritty-preferences";
import { runShellCommand } from "./run-shell-command";

const makeCommand = (text: string) =>
  [
    // echo command to the terminal
    `echo '${text}\n'`,
    // run command
    text,
    // prompt for key to exit
    "echo '\nPress any key to exit.\n'",
    // wait for key (zsh doesn't support -n)
    getAlacrittyPreferences().shell === Shell.Zsh ? "read -k1 -s" : "read -s -n1",
    // run each command in sequence, regardless of success
  ].join(" ; ");

export const runText = async (source: string, text: string) =>
  await confirmAlert({
    title: `Run command from ${source}`,
    message: `Run the following command?\n\n${text}`,
    primaryAction: {
      title: "Run",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        const command = makeCommand(text);
        await runShellCommand(command);
      },
    },
  });
