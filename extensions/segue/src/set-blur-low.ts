import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("blur/20", "🔲 Blur set to Low");
}
