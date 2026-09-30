import { runThawAction } from "@utils";

export default async function ToggleHidden() {
  await runThawAction("toggle-hidden");
}
