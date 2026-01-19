import { showHUD } from "@raycast/api";
import { run } from "./utils/run";

export default async function Command() {
  run("komorebic", ["retile"], async (error) => {
    await showHUD("Failed to retile windows");
    console.error(error);
  });
  await showHUD("Windows retiled");
}
