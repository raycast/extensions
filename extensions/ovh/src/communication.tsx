import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ContactMean, Notification } from "./types";
import { callOvh } from "./ovh";

function generateNotificationAccessories(notification: Notification) {
  const accessories: List.Item.Accessory[] = [];
  switch (notification.priority) {
    case "LOW":
      accessories.push({ tag: { value: notification.priority, color: Color.Blue } });
      break;
    case "MEDIUM":
      accessories.push({ tag: { value: notification.priority, color: Color.Yellow } });
      break;
    case "HIGH":
      accessories.push({ tag: { value: notification.priority, color: Color.Red } });
      break;
  }
  accessories.push({ date: new Date(notification.createdAt) });
  accessories.push({ text: notification.categories.join(", ") });
  return accessories;
}

export default function Communication(props: LaunchProps<{ arguments: Arguments.Communication }>) {
  if (props.arguments.view === "my-messages") return <MyMessages />;
  else return <Contacts />;
}

function MyMessages() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-notification-details", false);
  const { isLoading, data: notifications } = useCachedPromise(
    async () => {
      const list = await callOvh<Notification[]>("v2/notification/history");
      const notifications = await Promise.all(
        list.map((notification) =>
          callOvh<Notification & { text: string }>(`v2/notification/history/${notification.id}`),
        ),
      );
      return notifications;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} navigationTitle="My messages">
      {notifications.map((notification) => (
        <List.Item
          key={notification.id}
          title={notification.title}
          accessories={!isShowingDetail ? generateNotificationAccessories(notification) : undefined}
          detail={
            <List.Item.Detail
              markdown={notification.text}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Date" text={notification.createdAt} />
                  <List.Item.Detail.Metadata.TagList title="Priority">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={notification.priority}
                      color={
                        notification.priority === "LOW"
                          ? Color.Blue
                          : notification.priority === "MEDIUM"
                            ? Color.Yellow
                            : Color.Red
                      }
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="Categories" text={notification.categories.join(", ")} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function generateContactAccessories(contact: ContactMean) {
  const accessories: List.Item.Accessory[] = [];
  if (contact.default) accessories.push({ tag: { value: "By default", color: Color.Blue } });
  accessories.push({ text: "Email address" });
  accessories.push({ text: contact.email });

  switch (contact.status) {
    case "VALID":
      accessories.push({ tag: { value: "Active", color: Color.Green } });
      break;
    default:
      accessories.push({ tag: { value: contact.status } });
  }
  return accessories;
}
function Contacts() {
  const { isLoading, data: contacts } = useCachedPromise(
    async () => {
      const list = await callOvh<ContactMean[]>("v2/notification/contactMean");
      return list;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
    <List isLoading={isLoading} navigationTitle="Contacts">
      {contacts.map((contact) => (
        <List.Item key={contact.id} title={contact.description} accessories={generateContactAccessories(contact)} />
      ))}
    </List>
  );
}
