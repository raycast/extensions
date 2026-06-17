import { GoogleMailThreadPreview } from "../preview/GoogleMailThreadPreview";
import { NotificationActions } from "../../../action/NotificationActions";
import { Notification } from "../../../notification";
import { Icon, Color, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { GoogleMailThread } from "../types";
import { Page } from "../../../types";

interface GoogleMailThreadListItemProps {
  notification: Notification;
  googleMailThread: GoogleMailThread;
  mutate: MutatePromise<Page<Notification> | undefined>;
}

export function GoogleMailThreadListItem({ notification, googleMailThread, mutate }: GoogleMailThreadListItemProps) {
  const isStarred = googleMailThread.messages.some((message) => message.labelIds?.includes("STARRED"));
  const isImportant = googleMailThread.messages.some((message) => message.labelIds?.includes("IMPORTANT"));
  const fromAddress = googleMailThread.messages[0].payload.headers.find((header) => header.name === "From")?.value;
  const subtitle = fromAddress;

  const accessories: List.Item.Accessory[] = [
    {
      date: new Date(notification.updated_at),
      tooltip: `Updated at ${notification.updated_at}`,
    },
  ];

  if (isStarred) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Starred",
    });
  }

  if (isImportant) {
    accessories.unshift({
      icon: { source: Icon.Exclamationmark, tintColor: Color.Red },
      tooltip: "Important",
    });
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={{ source: { light: "google-mail-logo-dark.svg", dark: "google-mail-logo-light.svg" } }}
      accessories={accessories}
      subtitle={subtitle}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<GoogleMailThreadPreview notification={notification} googleMailThread={googleMailThread} />}
          mutate={mutate}
        />
      }
    />
  );
}
