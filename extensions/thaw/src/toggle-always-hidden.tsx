import { runThawAction } from "@utils";

export default async function ToggleAlwaysHidden() {
  await runThawAction("toggle-always-hidden");
}
