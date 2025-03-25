import { exec } from "child_process";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The AppleScript code to solve the user's request.
   */
  code: string;
};

/**
 * Write code in AppleScript to achieve the user's request.
 */
export default async function (input: Input) {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${input.code}'`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: "Allow this AppleScript code to run?\n```\n" + input.code + "\n```",
  };
};
