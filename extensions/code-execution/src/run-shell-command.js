import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

export default async function main(props) {
  let { command } = props.arguments;
  return new Promise((resolve, reject) => {
    exec(`${command.replace(/"/g, '\\"')}`, async (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Execute",
          message: stderr.trim(),
        });
      } else {
        resolve(stdout.trim());
        await showToast({
          style: Toast.Style.Success,
          title: "Ran Shell Command",
          message: stdout.trim(),
        });
      }
    });
  });
}
