import { runSlideTabCommand } from "./utils";

export default async function Command() {
  await runSlideTabCommand("toggle", "Toggled SlideTab");
}
