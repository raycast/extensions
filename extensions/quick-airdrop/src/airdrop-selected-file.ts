import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { airDropItems, describeItems } from "./lib/airdrop";

export default async function Command() {
  let paths: string[] = [];

  try {
    const items = await getSelectedFinderItems();
    paths = items.map((item) => item.path);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read Finder selection",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (paths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Select a file in Finder first",
    });
    return;
  }

  await showHUD(`Sharing ${describeItems(paths)} via AirDrop`);

  try {
    await airDropItems(paths);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AirDrop failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
