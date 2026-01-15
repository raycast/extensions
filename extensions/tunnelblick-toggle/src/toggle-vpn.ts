import { showHUD, PopToRootType } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {
  try {
    const configsOutput = await runAppleScript(
      'tell application "Tunnelblick" to get configurations',
    );

    if (!configsOutput || configsOutput.trim() === "") {
      await showHUD("⚠️ No Tunnelblick configurations found");
      return;
    }

    const firstConfig = configsOutput.split(",")[0];

    let configName = firstConfig.replace("configuration ", "").trim();

    if (configName.startsWith('"') && configName.endsWith('"')) {
      configName = configName.slice(1, -1);
    }

    const result = await runAppleScript(`
      tell application "Tunnelblick"
        set configState to get state of first configuration where name = "${configName}"

        if configState is "CONNECTED" then
          disconnect "${configName}"
          return "Disconnecting ${configName}"
        else
          connect "${configName}"
          return "Connecting ${configName}"
        end if
      end tell
    `);

    await showHUD(result, { popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showHUD("⚠️ Failed to toggle Tunnelblick", {
      popToRootType: PopToRootType.Immediate,
    });
    console.error(error);
  }
}
