import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("toggle", "✨ Segue toggled");
}
