import { exec } from "child_process";
import { showHUD } from "@raycast/api";

export default function command() {
  exec(`hidutil property --set '{"UserKeyMapping": []}'`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }
    console.log(`Output: ${stdout}`);
  });
  showHUD(`✅ Mac keyboard`);
}
