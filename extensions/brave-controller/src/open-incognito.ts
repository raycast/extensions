import { closeMainWindow, showHUD, PopToRootType } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });

  // The --incognito flag forces the new window into private mode
  const command = 'open -na "Brave Browser" --args --incognito';

  exec(command, (error) => {
    if (error) {
      console.error(error);
      showHUD("❌ Failed to open Incognito");
    }
  });
}
