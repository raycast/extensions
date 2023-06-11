import { showHUD } from "@raycast/api";
import { sync } from "./laravel-tip";

export default async function Search() {
  await showHUD("Syncing tips...");

  const { error } = await sync();

  if (error) {
    await showHUD(error.message);

    return;
  }

  await showHUD("Successfully synced all tips, enjoy!");
}
