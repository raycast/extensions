import { ActionPanel, Action, Icon, List, showToast, LocalStorage, Toast } from "@raycast/api";
import { CalEventType, CalUser, getEventTypesFromCache, getUserFromCache, refreshData } from "./services/cal.com";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

export default function Command() {
  const [items, setItems] = useState<CalEventType[] | undefined>(undefined);
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<CalUser | undefined>(undefined);

  async function init() {
    const updated_ts = await LocalStorage.getItem("updated_ts");
    console.log("init running...", { updated_ts });
    if (updated_ts === undefined || dayjs(updated_ts.toString()).isBefore(dayjs().subtract(24, "hours"))) {
      // either no cache, or cache is 24+ hours old
      console.log("refreshing data");
      await refreshData();
    }
    const user = await getUserFromCache();
    setUser(user);
    const eventTypes = await getEventTypesFromCache();
    setItems(eventTypes);

    setIsLoading(false);
  }

  useEffect(() => {
    init()
      .then()
      .catch((error) => {
        if (error.response.status === 401) {
          setShowError(true);
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Sorry, something went wrong",
          });
        }
      });
  }, []);
  return (
    <List isLoading={isLoading}>
      {items?.map((item) => (
        <List.Item
          key={item.id}
          icon="list-icon.png"
          title={item.title}
          subtitle={item.description}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
