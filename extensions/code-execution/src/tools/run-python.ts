import { exec } from "child_process";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The Python code to solve the user's request.
   */
  code: string;
};

/**
 * Write code in Python to solve the user's request. To give output to the user, use the print statement. The code must be able to be directly run to give output. If you need to use `subprocess`, use run-bash instead. When there is an error related to a module, TELL THE USER the module is missing, and use the run-bash command to suggest installing that module with pip.
 */
export default async function (input: Input) {
  return new Promise((resolve, reject) => {
    exec(
      `export PATH="$($SHELL -l -i -c 'echo -e "\n"PATH="$PATH:$PATH""\n"' 2>/dev/null | grep "^PATH=" | cut -d'=' -f2)"; python3 -c "${input.code.replace(/"/g, '\\"')}"`,
      (error, stdout, stderr) => {
        if (error) {
          if (error.message.includes("module")) {
            reject(`${stderr}`);
          } else {
            reject(`Error: ${stderr}`);
          }
        } else {
          console.log(stdout);
          resolve(stdout.trim());
        }
      },
    );
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    message: "Allow this Python code to run?\n```python\n" + input.code + "\n```",
  };
};
