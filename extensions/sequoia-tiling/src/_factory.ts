import { closeMainWindow, PopToRootType } from "@raycast/api";
import { invokeMenu, SubMenuType } from "./menuInvoker";

export function makeCommand(menuItemLabel: string, subMenu?: SubMenuType) {
  return async function () {
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    await invokeMenu(menuItemLabel, subMenu);
  };
}
