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
        await tgClient.disconnect();
      },
    };
    if (username) {
      await setTimeout(5000);
      await tgClient.sendMessage(username, { message: message });
      toast.style = Toast.Style.Success;
      toast.title = `Message sent to ${username}!`;
      await showHUD(`Message sent to ${username}!`);
    }
  } catch (e) {
    if ((e as Error).message == "Cannot send requests while disconnected. You need to call .connect()") {
      await showHUD("Message sending cancelled");
    } else {
      await showHUD("Error sending message");
      console.log("Error sending message: ", e);
    }
  } finally {
    tgClient.disconnect();
  }
}
