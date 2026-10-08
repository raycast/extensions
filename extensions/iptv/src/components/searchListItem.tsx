import { List, ActionPanel, Action } from "@raycast/api";
import { TvModelFlag } from "../interface/tvmodel";

export function SearchListItem({ channel }: { channel: TvModelFlag }) {
  return (
    <List.Item
      icon={channel.tvModel.tvg.logo}
      title={channel.title}
      subtitle={channel.tvModel.tvg.language.split(";").join(", ")}
      accessories={[{ text: channel.tvModel.tvg.id }, { text: channel.resolution }, { text: channel.flag }]}
      key={channel.tvModel.name + channel.tvModel.tvg.id}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={channel.tvModel.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy m3u8 URL"
              content={`${channel.tvModel.url}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
