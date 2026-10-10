import { closeMainWindow, open } from "@raycast/api";
import { run, settings } from "./utils";

export default async function Command() {
  await run("Opening Studio…", async () => {
    const { placeId, universeId } = settings("placeId", "universeId");
    await open(
      `roblox-studio:1+launchmode:edit+task:EditPlace+placeId:${placeId}+universeId:${universeId}`,
    );
    await closeMainWindow();
  });
}
