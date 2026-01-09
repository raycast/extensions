import { runSegueCommand } from "./utils";

export default async function Command() {
  await runSegueCommand("include", "✅ App included in Segue");
}
