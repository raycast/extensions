import {
  LocalStorage,
  ActionPanel,
  List,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import Inbox from "./inbox";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    const emailStore = await LocalStorage.getItem<string>("emails");
    return emailStore ? JSON.parse(emailStore) : [];
  });

  return (
    <List isLoading={isLoading}>
      <List.Section title="Email Address" subtitle={data?.length.toString()}>
        {!isLoading &&
          data?.map((email: string, index: number) => (
            <List.Item
              key={index}
              icon={{ source: Icon.PersonCircle, tintColor: "#A9C939" }}
              title={email}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Inbox" icon={{ source: Icon.Folder }} target={<Inbox email={email} />} />
                  <Action
                    title="Copy Email Address"
                    icon={{ source: Icon.CopyClipboard, tintColor: "#A9C939" }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={async () => {
                      await Clipboard.copy(email);
                      await showHUD("✅ Copied email address");
                    }}
                  />
                  <Action
                    title="Delete Email Address"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      const emailStore = await LocalStorage.getItem<string>("emails");
                      const emails = emailStore ? JSON.parse(emailStore) : [];
                      emails.splice(emails.indexOf(email), 1);
                      LocalStorage.setItem("emails", JSON.stringify(emails));
                      await showToast(Toast.Style.Success, "Deleted email address", email);
                      revalidate();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
