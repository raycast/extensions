import { closeMainWindow, open } from "@raycast/api";
import { run, settings } from "./utils";

export default async function Command() {
  await run("Opening Roblox…", async () => {
    const { placeId } = settings("placeId");
    await open(`roblox://experiences/start?placeId=${placeId}`);
    await closeMainWindow();
  });
}
