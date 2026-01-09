import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("disable", "⏸️ Segue disabled");
}
