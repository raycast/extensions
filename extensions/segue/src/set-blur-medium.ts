import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("blur/50", "🔲 Blur set to Medium");
}
