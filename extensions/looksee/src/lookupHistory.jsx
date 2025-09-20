import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getLookupResponseMarkdown } from "./common/getLookupResponseMarkdown";
import { useState } from "react";
import { useLookupHistory } from "./lookup-history/useLookupHistory";

export default function LookupHistory() {
  const [showingDetail, setShowingDetail] = useState(true);
  const { isLoading, data } = useLookupHistory();

  return (
    <List searchBarPlaceholder={"Search Previous Lookups"} isShowingDetail={showingDetail} isLoading={isLoading}>
      {data &&
        data?.map((item) => {
          const props = {
            detail: item.success ? (
              <List.Item.Detail markdown={getLookupResponseMarkdown(item.lookupResponse)} />
            ) : undefined,
          };

          return (
            <List.Item
              key={item.address}
              title={item.address}
              accessories={[
                {
                  icon: item.success ? Icon.Binoculars : Icon.Warning,
                  date: new Date(item.lookupTimestamp),
                },
              ]}
              {...props}
              actions={
                <ActionPanel>
                  <Action title={"Toggle Details"} onAction={() => setShowingDetail(!showingDetail)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
