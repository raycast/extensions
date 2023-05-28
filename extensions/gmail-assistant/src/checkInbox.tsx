import { List, Detail, Toast, showToast, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { EmailDetails, getService } from "./lib/types";
import { getAvatarIcon } from "@raycast/utils";

const serviceName = "google";

export default function Command() {
  const service = getService(serviceName);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<EmailDetails[]>([]);
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await service.authorize();
        const fetchedItems = await service.fetchInboxEmails();
        setItems(fetchedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Check your network connection" });
      }
    })();
  }, [service]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }
  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {items.map((item, id) => {
        const props: Partial<List.Item.Props> = item.body
          ? {
              detail: <List.Item.Detail markdown={item.body} />,
            }
          : { detail: "No body" };
        return (
          <List.Item
            key={id}
            id={item.link}
            // TODO: add message sender profile picture
            icon={getAvatarIcon(item.from)}
            {...props}
            title={item.subject}
            subtitle={item.from}
            actions={
              <ActionPanel>
                <Action icon={"file.png"} title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                <Action.OpenInBrowser url={item.link} />
                <Action
                  title="Logout"
                  onAction={async () => {
                    service.logout();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// Services
