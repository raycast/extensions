import { showHUD } from "@raycast/api";
import { run } from "./utils/run";

export default async function Command() {
  run("komorebic", ["stop", "--whkd"], async (error) => {
    await showHUD("Failed to stop komorebi");
    console.error(error);
  });
  await showHUD("Komorebi stopped");
}
