import { showToast, Toast, Tool } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

type Input = {
  /**
   * The command to give to Siri
   */
  command: string;
};

/**
 * Read the user input and reformat it as a request to Siri. Fix any grammatical or logical errors present in the request. Note that you are responsible for doing any writing tasks the user requests, such as writing a poem, greeting, or summarizing today's news. When sending a message, do not include a colon between the send a message clause and the actual message.
 * Q: Send Bob infomration about the average life span of dogs
 * A: Send Bob The average lifespan of dogs is 11 years
 * Q: Send Joe a quick greeting
 * A: Send Joe Hey, what's up?
 */
export default async function (input: Input) {
  try {
    await runAppleScript(`
    tell application "System Events" to tell the front menu bar of process "SystemUIServer"
        tell (first menu bar item whose description is "Siri")
            perform action "AXPress"
        end tell
    end tell
  
    delay 0.5
    tell application "System Events"
        set textToType to "${input.command}"
        keystroke textToType
        key code 36
    end tell
    `);
  } catch (error) {
    console.error(error);
    await showToast({
      title: "Failed to summon Siri. Ensure Siri is enabled in the Menu Bar.",
      style: Toast.Style.Failure,
    });
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: `Send this request to Siri?\n > ${input.command}`,
  };
};
