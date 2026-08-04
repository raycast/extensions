import { runThawAction } from "@utils";

export default async function OpenSettings() {
  await runThawAction("open-settings");
}
