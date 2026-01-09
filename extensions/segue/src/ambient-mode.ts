import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("mode/ambient", "🌅 Ambient Mode activated");
}
