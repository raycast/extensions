import { closeMainWindow, showHUD } from "@raycast/api";
import { currentSource } from "./lib/input-source";

export default async function Command() {
  await closeMainWindow();

  try {
    const { name } = await currentSource();
    await showHUD(name);
  } catch (error) {
    await showHUD(
      `Could not read input source: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
