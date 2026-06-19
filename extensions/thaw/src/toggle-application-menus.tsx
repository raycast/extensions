import { openThawUrl } from "@utils";

export default async function ToggleApplicationMenus() {
  await openThawUrl("toggle-application-menus", "Toggled Application Menus");
}
