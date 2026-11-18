import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import type { ApiTag } from "pond-api";
import { toError } from "./api/problems";
import { ProblemView } from "./components/problem";
import { SavesList } from "./components/saves-list";
import { useTags } from "./lib/library";
import { tagSearchLink } from "./lib/links";

function TagItem({ tag, onRefresh }: { tag: ApiTag; onRefresh: () => void }) {
  return (
    <List.Item
      title={tag.name}
      icon={tag.starred ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Tag}
      accessories={[{ text: tag.count.toLocaleString(), tooltip: `${tag.count.toLocaleString()} saves` }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Saves"
            icon={Icon.List}
            target={<SavesList filter={{ kind: "tag", name: tag.name }} navigationTitle={`#${tag.name}`} />}
          />
          <Action.Open title="Open in Pond" icon={Icon.AppWindow} target={tagSearchLink(tag.name)} />
          <Action.CopyToClipboard title="Copy Tag" content={tag.name} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CreateQuicklink
            title="Create Quicklink"
            quicklink={{ name: `Pond Tag ${tag.name}`, link: tagSearchLink(tag.name) }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const tags = useTags();
  const data = tags.data ?? [];
  const starred = data.filter((tag) => tag.starred);
  const rest = data.filter((tag) => !tag.starred).sort((a, b) => b.count - a.count);
  const failed = tags.error && !data.length ? toError(tags.error) : null;

  return (
    <List isLoading={tags.isLoading} searchBarPlaceholder="Search tags…">
      {failed ? (
        <ProblemView error={failed} onRetry={tags.revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Tag} title="No tags yet" description="Tag saves in Pond or from Search Saves." />
      )}
      <List.Section title="Starred">
        {starred.map((tag) => (
          <TagItem key={tag.name} tag={tag} onRefresh={tags.revalidate} />
        ))}
      </List.Section>
      <List.Section title="Tags" subtitle={rest.length ? rest.length.toLocaleString() : undefined}>
        {rest.map((tag) => (
          <TagItem key={tag.name} tag={tag} onRefresh={tags.revalidate} />
        ))}
      </List.Section>
    </List>
  );
}
