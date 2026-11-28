import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Post, listPosts } from "./api";

const tint: Record<string, Color> = {
  published: Color.Green,
  scheduled: Color.Blue,
  proposed: Color.Yellow,
  failed: Color.Red,
  canceled: Color.SecondaryText,
};

const when = (p: Post) => p.publishedAt || p.scheduledAt;

export default function Command() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = usePromise(listPosts, [status || undefined]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Status" onChange={setStatus}>
          <List.Dropdown.Item title="All" value="" />
          {Object.keys(tint).map((s) => (
            <List.Dropdown.Item
              key={s}
              title={s[0].toUpperCase() + s.slice(1)}
              value={s}
            />
          ))}
        </List.Dropdown>
      }
    >
      {(data ?? []).map((p) => (
        <List.Item
          key={p.id}
          title={p.postText.split("\n")[0] || "(no text)"}
          keywords={[p.postText]}
          accessories={[
            { tag: { value: p.platform } },
            { tag: { value: p.status, color: tint[p.status] } },
          ]}
          detail={
            <List.Item.Detail
              markdown={
                p.postText + (p.error ? `\n\n---\n**Error:** ${p.error}` : "")
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={p.status}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Platform"
                    text={p.platform}
                  />
                  {when(p) ? (
                    <List.Item.Detail.Metadata.Label
                      title="When"
                      text={new Date(when(p) as string).toLocaleString()}
                    />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {p.publishedLocation ? (
                <Action.OpenInBrowser
                  title="Open Live Post"
                  url={p.publishedLocation}
                />
              ) : null}
              <Action.OpenInBrowser
                title="Open ShapelessAI"
                url="https://shapelessai.com/studio"
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard title="Copy Text" content={p.postText} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
