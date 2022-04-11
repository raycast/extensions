import { ActionType, getItemAndSend } from "./send-file-utils";
import { showToast, Toast } from "@raycast/api";

export default async () => {
  await showToast(Toast.Style.Animated, `Copying... Don't quit.`);
  await getItemAndSend(ActionType.COPY);
};
