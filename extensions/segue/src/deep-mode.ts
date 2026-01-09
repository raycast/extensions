import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("mode/deep", "🎯 Deep Mode activated");
}
