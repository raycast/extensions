import { closeMainWindow, open } from "@raycast/api";
import { run, settings } from "./utils";

export default async function Command() {
  await closeMainWindow();

  await run("Opening Creator Dashboard...", async () => {
    const { universeId } = settings("universeId");
    await open(
      `https://create.roblox.com/dashboard/creations/experiences/${universeId}/overview`,
    );
  });
}
