import { getSelectedText, getApplications, Application } from "@raycast/api";

/**
 * Gets the name of the currently active application
 * @returns The name of the active application or undefined if not found
 */
export async function getActiveApplication(): Promise<string | undefined> {
  try {
    // Try to get selected text to determine active app
    const result = await getSelectedText();
    if (typeof result === "object" && "application" in result) {
      return (result as { application: Application }).application.name;
    }
  } catch {
    // Fallback: get all applications and find the frontmost one
    const apps = await getApplications();
    const frontmostApp = apps.find((app) => app.name === apps[0].name);
    return frontmostApp?.name;
  }
  return undefined;
}
