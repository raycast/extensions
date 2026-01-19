import { showHUD } from "@raycast/api";
import { run } from "./utils/run";

export default async function Command() {
  run("yasbc", ["reload"], async (error) => {
    await showHUD("Failed to reload YASB");
    console.error(error);
  });
  await showHUD("YASB reloaded");
}
