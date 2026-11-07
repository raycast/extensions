import { runCopyAllTabs } from "./lib/run";

export default async function Command() {
  await runCopyAllTabs();
}
