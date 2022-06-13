import { scriptToProcessRawBunchText } from "./utils/applescript-utils";
import { closeMainWindow, showHUD } from "@raycast/api";
import { fetchItemInput } from "./utils/input-item";
import { isEmpty } from "./utils/common-utils";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const inputItem = (await fetchItemInput()).trim();
  if (isEmpty(inputItem)) {
    await showHUD("No text detected");
    return;
  }
  const result = await scriptToProcessRawBunchText(inputItem);
  await showHUD(result);
};
