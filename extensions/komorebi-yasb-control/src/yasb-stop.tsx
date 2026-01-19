import { showHUD } from "@raycast/api";
import { run } from "./utils/run";

export default async function Command() {
  run("yasbc", ["stop"], async (error) => {
    await showHUD("Failed to stop YASB");
    console.error(error);
  });
  await showHUD("YASB stopped");
}
