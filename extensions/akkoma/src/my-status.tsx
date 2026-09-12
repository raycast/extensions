import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Toast, showToast, Cache } from "@raycast/api";
import { Status, AkkomaError } from "./utils/types";

import { getAccessToken } from "./utils/oauth";
import apiServer from "./utils/api";
import { statusParser } from "./utils/util";

const cache = new Cache();

export default function ViewStatusCommand() {
  const cached = cache.get("latest_statuses");
  const [statuses, setStatuses] = useState<Status[]>(cached ? JSON.parse(cached) : []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getBookmark = async () => {
      try {
        await getAccessToken();
        showToast(Toast.Style.Animated, "Loading Status...");
        const status = await apiServer.fetchUserStatus();
        setStatuses(statuses);
        showToast(Toast.Style.Success, "Statuses has been loaded");
        cache.set("latest_statuses", JSON.stringify(status));
      } catch (error) {
        const requestErr = error as AkkomaError;
        showToast(Toast.Style.Failure, "Error", requestErr.error);
      } finally {
        setIsLoading(false);
      }
    };
    getBookmark();
  }, []);

  const filterReblog = (statuses: Status[]) => statuses.filter((status) => !status.reblog);

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search your status">
      {filterReblog(statuses)?.map((status) => (
        <List.Item
          title={status.akkoma.source.content}
          key={status.id}
          detail={<List.Item.Detail markdown={statusParser(status, "date")} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Original Status" url={status.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
