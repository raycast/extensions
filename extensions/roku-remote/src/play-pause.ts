import { runQuickKey } from "./lib/actions";

export default async function Command() {
  await runQuickKey("Play", "Play/pause");
}
