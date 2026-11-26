import { runSlideTabCommand } from "./utils";

export default async function Command() {
  await runSlideTabCommand("pause-current-app", "Updated Per-App Pause for Frontmost App");
}
