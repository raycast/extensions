import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("settings", "⚙️ Opening Segue settings");
}
