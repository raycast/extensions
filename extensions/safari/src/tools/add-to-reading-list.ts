import { runAppleScript } from "@raycast/utils";
import { safariAppIdentifier } from "../utils";

type Input = {
  /**
   * The URL to add to the reading list.
   */
  url: string;
};

const tool = async (input: Input) => {
  await runAppleScript(`
      tell application "${safariAppIdentifier}"
        set theURL to "${input.url}"
        add reading list item theURL
      end tell
    `);
};

export default tool;
