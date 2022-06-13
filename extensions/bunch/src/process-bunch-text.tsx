import { closeMainWindow, open, showHUD } from "@raycast/api";
import { fetchItemInput } from "./utils/input-item";
import { isEmpty } from "./utils/common-utils";

export default async () => {
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
