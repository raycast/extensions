import { runThawAction } from "@utils";

export default async function ToggleShowOnHover() {
  await runThawAction("toggle-show-on-hover");
}
