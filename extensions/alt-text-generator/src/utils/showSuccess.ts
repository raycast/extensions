// import { showCopyTip } from "../types/preferences";
import { PopToRootType, showToast, Toast } from "@raycast/api";

export const showSuccess = async (
  title: string,
  HUDOptions?: { clearRootSearch?: boolean | undefined; popToRootType?: PopToRootType | undefined } | undefined,
) => {
  console.log(HUDOptions);
  // await showHUD(title, HUDOptions);
  await showToast({ style: Toast.Style.Success, title: title });
};
