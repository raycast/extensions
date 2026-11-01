import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SITE, TOOLS, toolUrl } from "./lib/site";

const ICON: Record<string, Icon> = { Text: Icon.Text, Images: Icon.Image, Subtitles: Icon.Video };

export default function Command() {
  const groups = [...new Set(TOOLS.map((t) => t.group))];
  return (
    <List searchBarPlaceholder="Search free online tools">
      {groups.map((g) => (
        <List.Section key={g} title={g}>
          {TOOLS.filter((t) => t.group === g).map((t) => (
            <List.Item
              key={t.slug}
              title={t.title}
              subtitle={t.desc}
              icon={ICON[g]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={toolUrl(t.slug)} />
                  <Action.CopyToClipboard title="Copy Link" content={toolUrl(t.slug)} />
                  <Action.OpenInBrowser title="Open GoSaveTool Home" url={SITE} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
