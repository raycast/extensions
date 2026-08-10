import { runThawAction } from "@utils";

export default async function ToggleThawbar() {
  await runThawAction("toggle-thawbar");
}
