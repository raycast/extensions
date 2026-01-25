import { updateCommandMetadata } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const script = `
      try
        tell application "DesktopRenamer" to get current space name
      on error e
        return "ERROR: " & e
      end try
    `;

    const result = await runAppleScript(script);

    if (result.startsWith("ERROR") || !result) {
      console.error("AppleScript Error:", result);
      await updateCommandMetadata({
        subtitle: `Connection Failed`,
      });
      return;
    }

    const name = result.trim();
    await updateCommandMetadata({
      subtitle: `${name}`,
    });
  } catch (error) {
    console.error(error);
    await updateCommandMetadata({
      subtitle: "Error",
    });
  }
}
