import { runThawAction } from "@utils";

export default async function ToggleAutoRehide() {
  await runThawAction("toggle-auto-rehide");
}
