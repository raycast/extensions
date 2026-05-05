import { closeMainWindow, PopToRootType } from "@raycast/api";
import { SubMenuType } from "./constants";
import { invokeMenu } from "./menuInvoker";

export function makeCommand(menuItemLabel: string, subMenu?: SubMenuType) {
  return async function () {
    await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    await invokeMenu(menuItemLabel, subMenu);
  };
}
