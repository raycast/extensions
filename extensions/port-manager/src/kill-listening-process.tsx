import { LaunchProps, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

function isInteger(str: string): boolean {
  return Number.isInteger(parseInt(str, 10));
}

async function run(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trimEnd());
      } else {
        resolve(stdout.trimEnd());
      }
    });
  });
}

export default async function Command(
  // "Index" here refers to the "name" property of this command
  // specified in package.json AND matches the name of this source file.
  props: LaunchProps<{ arguments: Arguments.KillListeningProcess }>
) {
  const { port } = props.arguments;
  if (!isInteger(port)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Bad Port",
      message: "The port must be an integer.",
    });
    return;
  }

  const command = `/usr/sbin/lsof -n -iTCP:${port} -sTCP:LISTEN -t`;

  try {
    const pid = await run(command);
    await run("kill " + pid);
    showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: `Process ${pid} was killed.`,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `No process is listening on port ${port}.`,
    });
  }
}
