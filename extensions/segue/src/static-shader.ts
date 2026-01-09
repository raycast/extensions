import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("render/static", "⬜ Static shader enabled");
}
