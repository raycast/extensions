import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getMemosConnection } from "./helpers/preferences";

const OpenMemosCommand = async () => {
  try {
    const { instanceUrl } = getMemosConnection();
    await open(instanceUrl);
    await showHUD(`Opened ${instanceUrl}`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Memos" });
  }
};

export default OpenMemosCommand;
