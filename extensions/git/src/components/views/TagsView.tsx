import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { RemoteFetchAction } from "../actions/RemoteActions";
import { useMemo, useState } from "react";
import {
  TagAttachedLinksAction,
  TagCheckoutAction,
  TagCreateAction,
  TagDetailsView,
  TagsPushAction,
  TagRemoveAction,
  TagRenameAction,
} from "../actions/TagActions";
import { Tag } from "../../types";
import { CopyToClipboardMenuAction } from "../actions/CopyToClipboardMenuAction";

export default function TagsView(context: RepositoryContext & NavigationContext) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  return (
    <List
      isLoading={context.tags.isLoading}
      navigationTitle={context.gitManager.repoName}
      searchBarPlaceholder="Search tags by name..."
      selectedItemId={selectedTagId || undefined}
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          {context.branches.data.currentBranch && (
            <TagCreateAction
              {...context}
              ref={context.branches.data.currentBranch.name}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}

          <ActionPanel.Section>
            <TagsPushAction {...context} />
            <RemoteFetchAction {...context} />
          </ActionPanel.Section>

          <RefreshTagsAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {context.tags.error ? (
        <List.EmptyView
          title="Error loading tags"
          description={context.tags.error.message}
          icon={Icon.ExclamationMark}
        />
      ) : !context.tags.isLoading && context.tags.data.length === 0 ? (
        <List.EmptyView title="No tags" description="Repository has no tags." icon={Icon.Tag} />
      ) : (
        context.tags.data.map((tag, index) => (
          <TagListItem key={tag.name} tag={tag} index={index} onMoveToTag={setSelectedTagId} {...context} />
        ))
      )}
    </List>
  );
}

function TagListItem(
  context: RepositoryContext &
    NavigationContext & {
      tag: Tag;
      index: number;
      onMoveToTag: (tagName: string) => void;
    },
) {
  const accessories: List.Item.Accessory[] = useMemo(() => {
    const items: List.Item.Accessory[] = [];

    if (context.tag.author) {
      items.push({ text: context.tag.author, tooltip: context.tag.authorEmail });
    }

    if (context.tag.date) {
      items.push({
        text: context.tag.date.toRelativeDateString(),
        tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(context.tag.date),
      });
    }

    return items;
  }, [context.tag.author, context.tag.date]);

  return (
    <List.Item
      id={context.tag.name}
      title={context.tag.name}
      subtitle={{
        value: context.tag.message,
        tooltip: context.tag.message,
      }}
      icon={Icon.Tag}
      accessories={accessories}
      keywords={
        [
          context.tag.name,
          context.tag.commitHash,
          context.tag.message,
          context.tag.author,
          context.tag.authorEmail,
        ].filter(Boolean) as string[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={context.tag.name}>
            <Action.Push title="Show Commit" icon={Icon.Document} target={<TagDetailsView {...context} />} />
            <TagCheckoutAction tagName={context.tag.name} {...context} />
            <TagRenameAction tagName={context.tag.name} {...context} />
            <CopyToClipboardMenuAction
              contents={[
                { title: "Tag Name", content: context.tag.name, icon: Icon.Tag },
                { title: "Commit Hash", content: context.tag.commitHash, icon: Icon.Hashtag },
              ]}
            />
            <TagRemoveAction tagName={context.tag.name} {...context} />
          </ActionPanel.Section>

          {context.branches.data.currentBranch && (
            <TagCreateAction
              {...context}
              ref={context.branches.data.currentBranch.name}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          )}

          <ActionPanel.Section>
            <TagsPushAction {...context} />
            <RemoteFetchAction {...context} />
          </ActionPanel.Section>

          <TagAttachedLinksAction {...context} />
          <RefreshTagsAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function RefreshTagsAction(context: RepositoryContext & NavigationContext) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={context.tags.revalidate}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
