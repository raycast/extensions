import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("exclude", "🚫 App excluded from Segue");
}
