import { environment, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    const { toggleCursor } = await import("swift:../swift/cursor-helper");
    const visibility = await toggleCursor(environment.supportPath);

    await showHUD(
      visibility === "hidden" ? "Mouse cursor hidden" : "Mouse cursor shown",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    await showHUD(`Couldn’t toggle cursor: ${message}`);
  }
}
