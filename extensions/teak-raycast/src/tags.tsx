import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountActions } from "./components/AccountActions";
import { CardsListCommand } from "./components/CardsListCommand";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import {
  confirmAndDeleteTag,
  MergeTagList,
  RenameTagForm,
} from "./components/TagForms";
import {
  getUserFacingErrorMessage,
  listTags,
  searchCards,
  type TagSummary,
} from "./lib/api";
import { useTeakAuth } from "./lib/useTeakAuth";

function TagCardsView({ tag }: { tag: string }) {
  return (
    <CardsListCommand
      emptyDescription={`No cards are tagged with "${tag}" right now.`}
      emptyIcon={Icon.Tag}
      emptyTitle={`No cards tagged "${tag}"`}
      loadCards={(input) =>
        searchCards({ ...input, limit: 50, tag }, "interactive")
      }
      navigationTitle={`Tag: ${tag}`}
      removeTagFilterFromList
      scopeTag={tag}
      searchBarPlaceholder={`Search within "${tag}", or filter with fav, sort:oldest`}
      sectionTitle={`Tagged "${tag}"`}
    />
  );
}

export default function TagsCommand() {
  const {
    isAuthenticated,
    error: authError,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

  const [tags, setTags] = useState<TagSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const { push } = useNavigation();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listTags("interactive");
      setTags(response.items);
    } catch (requestError) {
      setError(getUserFacingErrorMessage(requestError));
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }

    if (!isAuthenticated) {
      setTags([]);
      setIsLoading(false);
      return;
    }

    void load();
  }, [isCheckingAuth, isAuthenticated, load]);

  const filteredTags = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return tags;
    }
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalized));
  }, [searchText, tags]);

  const searchBar = {
    onSearchTextChange: setSearchText,
    searchBarPlaceholder: "Filter tags…",
    searchText,
  };

  if (isCheckingAuth) {
    return <List isLoading {...searchBar} />;
  }

  const listActions = (
    <>
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          onAction={() => void load()}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          title="Reload Tags"
        />
      </ActionPanel.Section>
      <AccountActions onSignedOut={refreshAuth} />
    </>
  );

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  return (
    <List isLoading={isLoading} {...searchBar}>
      {error ? (
        <List.EmptyView
          actions={<ActionPanel>{listActions}</ActionPanel>}
          description="Check your connection, then reload."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}

      {!(error || isLoading) && filteredTags.length === 0 ? (
        <List.EmptyView
          actions={<ActionPanel>{listActions}</ActionPanel>}
          description={
            searchText.trim()
              ? "Try a different keyword to find tags."
              : "Add tags to your Teak cards to see them listed here."
          }
          icon={Icon.Tag}
          title={searchText.trim() ? "No matching tags" : "No tags yet"}
        />
      ) : null}

      <List.Section
        subtitle={
          filteredTags.length > 0
            ? `${filteredTags.length} tag${filteredTags.length === 1 ? "" : "s"}`
            : undefined
        }
        title={searchText.trim() ? "Results" : "All Tags"}
      >
        {filteredTags.map((tag) => (
          <List.Item
            accessories={[
              {
                text: `${tag.count} card${tag.count === 1 ? "" : "s"}`,
                tooltip: `${tag.count} card${tag.count === 1 ? "" : "s"} tagged "${tag.name}"`,
              },
            ]}
            actions={
              <ActionPanel title={tag.name}>
                <Action
                  icon={Icon.Eye}
                  onAction={() => {
                    push(<TagCardsView tag={tag.name} />);
                  }}
                  title="View Cards"
                />
                <Action.CopyToClipboard
                  content={tag.name}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  title="Copy Tag Name"
                />
                <ActionPanel.Section title="Change Tag">
                  <Action.Push
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <RenameTagForm onFinished={() => void load()} tag={tag} />
                    }
                    title="Rename Tag"
                  />
                  <Action.Push
                    icon={Icon.Tag}
                    shortcut={{ key: "m", modifiers: ["cmd", "shift"] }}
                    target={
                      <MergeTagList
                        onFinished={() => void load()}
                        tag={tag}
                        tags={tags}
                      />
                    }
                    title="Merge into…"
                  />
                  <Action
                    icon={Icon.Trash}
                    onAction={() =>
                      void confirmAndDeleteTag(tag, () => void load())
                    }
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    style={Action.Style.Destructive}
                    title="Delete Tag"
                  />
                </ActionPanel.Section>
                {listActions}
              </ActionPanel>
            }
            icon={{ source: Icon.Tag, tintColor: Color.Blue }}
            key={tag.name}
            title={tag.name}
          />
        ))}
      </List.Section>
    </List>
  );
}
