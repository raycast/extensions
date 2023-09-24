import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState } from "react";
import MIME_MAP from "./mime-map.json";

export default function Command() {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <List isShowingDetail={showDetail}>
      {Object.entries(MIME_MAP).map(([cat, cat_map]) => (
        <List.Section key={cat} title={cat}>
          {Object.entries(cat_map).map(([mime, item]) => (
            <List.Item
              key={mime}
              icon={Icon.Dot}
              title={mime}
              // subtitle={item.description ?? ""}
              // accessories={[{ text: item.exts.join(" ") }]}
              subtitle={item.exts.join(" ")}
              accessories={[{ text: item.description ?? "" }]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="MIME" text={mime} />
                      <List.Item.Detail.Metadata.Label title="Description" text={item.description ?? ""} />
                      <List.Item.Detail.Metadata.Label title="Exts" text={item.exts.join(" ")} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={showDetail ? Icon.ArrowsContract : Icon.ArrowsExpand}
                    title={`${showDetail ? "Hide" : "Show"} Detail Panel`}
                    onAction={() => {
                      setShowDetail(!showDetail);
                    }}
                  />
                  <Action.CopyToClipboard content={mime} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
