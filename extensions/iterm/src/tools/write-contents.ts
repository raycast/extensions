import { Tool } from "@raycast/api";
import { runAppleScript } from "run-applescript";

type Input = {
  // Text to write to iTerm. Escape all quotes.
  text: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: `Do you want to execute the following command?`,
    info: [{ name: "Command", value: input.text.trim() }],
  };
};

export default async function (input: Input) {
  await runAppleScript(`
    tell application "iTerm2"
      tell current session of current window
        write text "${input.text.trim()}"
      end tell
    end tell
  `);
}
