import { closeMainWindow, open, showHUD } from "@raycast/api";
import { fetchItemInput } from "./utils/input-item";
import { bunchInstalled, isEmpty } from "./utils/common-utils";
import { bunchNotInstallAlertDialog } from "./hooks/hooks";

export default async () => {
  if (!bunchInstalled()) {
    await bunchNotInstallAlertDialog();
    return;
  }
  await closeMainWindow({ clearRootSearch: false });
  try {
    const inputItem = (await fetchItemInput()).trim();
    if (isEmpty(inputItem)) {
      await showHUD("No text detected");
      return;
    }

    await open(encodeURI(`x-bunch://raw?txt=${inputItem}`));
    await showHUD("Process: " + inputItem);
  } catch (e) {
    await showHUD(String(e));
  }
};
