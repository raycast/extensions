import { exec } from "child_process";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The Bash code to solve the user's request.
   */
  code: string;
};

/**
 * Write code in Bash to solve the user's request.
 */
export default async function (input: Input) {
  return new Promise((resolve, reject) => {
    exec(
      `export PATH="$($SHELL -l -i -c 'echo -e "\n"PATH="$PATH:$PATH""\n"' 2>/dev/null | grep "^PATH=" | cut -d'=' -f2)"; ${input.code.replace(/"/g, '\\"')}`,
      { env: process.env },
      (error, stdout, stderr) => {
        if (error) {
          reject(`Error: ${stderr}`);
        } else {
          resolve(stdout.trim());
        }
      },
    );
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: "Allow this Bash code to run?\n```bash\n" + input.code + "\n```",
  };
};
