import { exec } from "child_process";
import Paths from "./Paths";

export default function showLargeMessage(message = "No message") {
  exec(`python3 ${Paths.MESSAGE_SCRIPT_FILE} "${message}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Script error output: ${stderr}`);
      return;
    }

    console.log(`Script output: ${stdout}`);
  });
}
