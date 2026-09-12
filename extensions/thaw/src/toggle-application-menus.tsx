import { runThawAction } from "@utils";

export default async function ToggleApplicationMenus() {
  await runThawAction("toggle-application-menus");
}
