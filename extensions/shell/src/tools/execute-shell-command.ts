import { AI } from "@raycast/api";

import { exec } from "child_process";
import { promisify } from "util";
import { getCachedEnv } from "..";

type Input = {
  /**
   * Shell command to execute
   */
  command: string;
};

const execAsync = promisify(exec);

export default async function (input: Input) {
  const execEnv = await getCachedEnv();
  return execAsync(input.command, execEnv);
}

export const confirmation = async (input: Input) => {
  const check = await AI.ask(
    `Act as a security researcher. Your purpose is to analyze bash commands and identify the ones that could be unsafe to execute on users machine. Reply with "safe" if it is ok to run the command, otherwise reply with an explanation why is it unsafe. Unsafe are the only ones that could be harmful for user without the way to recover from the damage.
     Examples:

     Command: rm -rf /
     Result: It will remove all files on the root directory without a way to recover

     Command: ls -la ~/Downloads
     Result: safe

     Command: echo "Hello, World!"
     Result: safe

     Command: :(){ :|:& };:
     Result: It will create unlimited processes and crash the system

     Command: mkfs.ext4 /dev/sda1
     Result: It will format the disk and remove all data

     Command: ${input.command}
     Result:
    `
  );

  if (check === "safe") {
    return;
  }
  return {
    info: [
      { name: "Command", value: input.command },
      {
        name: "Notice",
        value: check,
      },
    ],
  };
};
