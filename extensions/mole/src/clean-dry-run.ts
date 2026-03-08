import { runMoleCommand } from "./utils";

export default async function Command() {
  await runMoleCommand("clean", ["--dry-run"]);
}
