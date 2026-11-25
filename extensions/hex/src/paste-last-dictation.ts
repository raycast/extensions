import { runControl } from "./lib/feedback";

export default async function Command() {
  await runControl(["paste-last"], { changed: null });
}
