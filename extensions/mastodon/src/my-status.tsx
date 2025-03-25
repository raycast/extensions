import { useEffect } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

import { Status } from "./utils/types";
import { contentExtractor, statusParser } from "./utils/helpers";
import { useMe } from "./hooks/useMe";

import MyStatusActions from "./components/MyStatusActions";
import ReplyAction from "./components/ReplyAction";

export default function ViewStatusCommand() {
  const { isLoading, statuses, getMyStatuses } = useMe();

  useEffect(() => {
    getMyStatuses();
  }, []);

  const filterReblog = (statuses: Status[]) => statuses.filter((status) => !status.reblog);

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search your status">
      {statuses &&
        filterReblog(statuses).map((status) => (
          <List.Item
            title={contentExtractor(status.content)}
            key={status.id}
            detail={<List.Item.Detail markdown={statusParser(status, "date")} />}
            actions={
              <ActionPanel>
                <ReplyAction status={status} />
                <MyStatusActions status={status} />
                <Action.OpenInBrowser url={status.url} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
