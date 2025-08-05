import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { checkBobInstallation } from "./checkInstall";

export async function callBob(command: string): Promise<void> {
  if (await checkBobInstallation()) {
    await closeMainWindow();
    // https://bobtranslate.com/guide/integration/applescript.html
    const script = `
      use scripting additions
      use framework "Foundation"
      on callBob(recordValue)
        set theParameter to (((current application's NSString)'s alloc)'s initWithData:((current application's NSJSONSerialization)'s dataWithJSONObject:recordValue options:1 |error|:(missing value)) encoding:4) as string
        tell application id "com.hezongyidev.Bob" to request theParameter
      end callBob

      callBob(${command})
    `;
    await runAppleScript(script).catch((error) => console.error("Failed to run callBob() in AppleScript", error));
  }
}
