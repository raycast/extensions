import { ActionPanel, Action, Icon, List } from "@raycast/api";
import MIME_MAP from "./mime-map.json";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [showDetail, setShowDetail] = useCachedState("settings", false);
  return (
    <List isShowingDetail={showDetail}>
      <List.EmptyView icon="no-view.png" title="No Results" description="Search for something else..." />
      {Object.entries(MIME_MAP).map(([cat, cat_map]) => (
        <List.Section key={cat} title={cat}>
          {Object.entries(cat_map).map(([mime, item]) => (
            <List.Item
              key={mime}
              icon={Icon.Dot}
              title={mime}
              subtitle={showDetail ? "" : item.exts.join(" ")}
              accessories={showDetail ? [] : [{ text: item.description ?? "" }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="MIME" text={mime} />
                      <List.Item.Detail.Metadata.Label title="Description" text={item.description ?? "-"} />
                      <List.Item.Detail.Metadata.Label title="Extensions" text={item.exts.join(" ")} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={mime} />
                  <Action
                    icon={showDetail ? Icon.ArrowsContract : Icon.ArrowsExpand}
                    title={`${showDetail ? "Hide" : "Show"} Details`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={() => {
                      setShowDetail(!showDetail);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
