import { closeMainWindow, showHUD } from "@raycast/api";
import { exec } from "child_process";

function startStream(): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `open -a "Quicktime Player" "https://stream.radiofrance.fr/fip/fip_hifi.m3u8"`;

    exec(command, (error, _, stderr) => {
      if (error) {
        reject("Failed to start FIP radio stream");
      }
      if (stderr) {
        reject(stderr);
      }
      resolve("FIP radio stream successfully started");
    });
  });
}

export default async () => {
  await closeMainWindow();
  const res = await startStream();
  showHUD(res);
};
