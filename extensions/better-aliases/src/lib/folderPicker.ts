import { runAppleScript } from "@raycast/utils";

export async function pickFolder(): Promise<string | null> {
  const script = `
    set chosenFolder to choose folder with prompt "Select destination folder for export"
    return POSIX path of chosenFolder
  `;

  try {
    const result = await runAppleScript(script);
    return result.trim();
  } catch {
    return null;
  }
}
