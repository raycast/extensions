import { Api, TelegramClient } from "telegram";
import { getSession, returnClient } from "./utils/tgClient";
import { LaunchProps, LaunchType, Toast, launchCommand, showHUD, showToast } from "@raycast/api";
import { setTimeout } from "timers/promises";

interface messageArgs {
  contact: string;
  message: string;
}
export default async function quickmsg(props: LaunchProps<{ arguments: messageArgs }>) {
  const sessionString = await getSession();
  if (!sessionString) {
    await launchCommand({ name: "tglogin", type: LaunchType.UserInitiated });
    return;
  }
  const tgClient: TelegramClient | undefined = await returnClient();
  const { contact, message } = props.arguments;
  await tgClient.connect();
  let canSendMessage = false;
  try {
    const contacts: Api.contacts.Found = await tgClient.invoke(
      new Api.contacts.Search({
        q: contact,
        limit: 3,
      })
    );
    const users: Api.User[] = (contacts.users as Api.User[]).filter(
      (user) => user.bot === false && user.contact == true && user.username != null
    );
    if (users.length === 0) {
      return;
    }
    const username = users[0].username;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "",
    });
    toast.title = "Sending message to: " + username;
    toast.primaryAction = {
      title: "Cancel",
      onAction: async () => {
        canSendMessage = false;
      },
    };
    if (username) {
      await setTimeout(5000);
      // canSendMessage = true;
      // setTimeout(async () => {
      //   if (!canSendMessage) {
      //     await showHUD("Message sending cancelled");
      //     return;
      //   }
      await tgClient.sendMessage(username, { message: message });
      toast.style = Toast.Style.Success;
      toast.title = `Message sent to ${username}!`;
      await showHUD(`Message sent to ${username}!`);
      // }, 5000);
    }
  } catch (e) {
    const error = e as Error;
    if (error.message == "Cannot send requests while disconnected. You need to call .connect()") {
      await showHUD("Message sending cancelled");
    } else if (error.message.includes("AUTH_KEY_UNREGISTERED")) {
      await showHUD("Your session has either expired or terminated, redirecting you for login");
      await launchCommand({ name: "tglogin", type: LaunchType.UserInitiated });
    } else {
      await showHUD("Error sending message");
      console.log("Error sending message: ", e);
    }
  } finally {
    tgClient.disconnect();
  }
}
