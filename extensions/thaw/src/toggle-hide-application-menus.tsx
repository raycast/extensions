import { runThawAction } from "@utils";

export default async function ToggleHideApplicationMenus() {
  await runThawAction("toggle-hide-application-menus");
}
