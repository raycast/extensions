import { getSelectedMessage, isEmpty, sendMessage } from "./utils/common-utils";
import { showHUD } from "@raycast/api";

export default async () => {
  const message = await getSelectedMessage();
  if (isEmpty(message)) {
    await showHUD("No message to send");
    return;
  }
  await sendMessage(message, "", "", 0);
};
