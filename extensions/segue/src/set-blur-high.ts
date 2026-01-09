import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("blur/80", "🔲 Blur set to High");
}
