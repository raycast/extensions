import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Item } from "./types";
import { getMarkdownTable } from "./utils";

export function renderListItem(item: Item, isShowingDetail: boolean, setIsShowingDetail: (showing: boolean) => void) {
  // Get the most recent conference
  const latestConf = item.confs?.[0];

  return (
    <List.Item
      key={item.title}
      icon={Icon.Calendar}
      title={item.title}
      subtitle={item.sub}
      accessories={[{ text: `CCF: ${item.rank.ccf}` }, { text: latestConf?.place || "Location unknown" }]}
      actions={
        <ActionPanel>
          {latestConf?.link && <Action.OpenInBrowser title="Open Conference Website" url={latestConf.link} />}
          <Action
            title="Toggle Detail View"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => setIsShowingDetail(!isShowingDetail)}
          />
          <Action.CopyToClipboard
            title="Copy Conference Info"
            content={`${item.title}: ${item.description}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={getMarkdownTable(item)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Conference" text={item.title} />
              <List.Item.Detail.Metadata.Label title="Description" text={item.description} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Category" text={item.sub} />
              <List.Item.Detail.Metadata.Label title="CCF Rank" text={item.rank.ccf || "N/A"} />
              <List.Item.Detail.Metadata.Label title="CORE Rank" text={item.rank.core || "N/A"} />
              <List.Item.Detail.Metadata.Label title="THCPL Rank" text={item.rank.thcpl || "N/A"} />
              {latestConf && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Next Conference" text={`${latestConf.year}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Next Deadline"
                    text={latestConf.timeline?.[0]?.deadline || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label title="Timezone" text={latestConf.timezone || "N/A"} />
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
