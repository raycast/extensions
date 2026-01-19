import { showHUD } from "@raycast/api";
import { run } from "./utils/run";

export default async function Command() {
  run("yasbc", ["start"], async (error) => {
    await showHUD("Failed to start YASB");
    console.error(error);
  });
  await showHUD("YASB started");
}
