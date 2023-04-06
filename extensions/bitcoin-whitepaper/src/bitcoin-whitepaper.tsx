import { Command } from "commander";
import { exec } from "child_process";
import { existsSync } from "fs";
import { showHUD } from "@raycast/api";

const program = new Command();

program
  .name("bitcoin")
  .description("Open the Bitcoin Whitepaper")
  .action(async () => {
    const filePath = "/System/Library/Image Capture/Devices/VirtualScanner.app/Contents/Resources/simpledoc.pdf";
    const formattedFilePath =
      "/System/Library/Image\\ Capture/Devices/VirtualScanner.app/Contents/Resources/simpledoc.pdf";
    if (existsSync(filePath)) {
      exec(`open ${formattedFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        process.exit();
      });
    } else {
      await showHUD("File not found");
    }
  });

program.parse();
