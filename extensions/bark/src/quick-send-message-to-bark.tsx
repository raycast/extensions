import { getSelectedMessage, isEmpty, sendMessage } from "./utils/common-utils";
import { LaunchProps, showHUD } from "@raycast/api";
import { autoCloseWindow, autoGetMessage } from "./types/preferences";

interface BarkArguments {
  message: string;
  title: string;
  subtitle: string;
}

export default async (props: LaunchProps<{ arguments: BarkArguments }>) => {
  const { message, title, subtitle } = props.arguments;
  let finalMessage = message;
  if (isEmpty(message) && autoGetMessage) {
    finalMessage = await getSelectedMessage();
  }
  if (isEmpty(finalMessage)) {
    await showHUD("🚨 No message to send");
    return;
  }
  await sendMessage(finalMessage, isEmpty(title) ? "" : title, isEmpty(subtitle) ? "" : subtitle, 0, autoCloseWindow);
};
