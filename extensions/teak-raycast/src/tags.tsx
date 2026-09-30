import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { CardsListCommand } from "./components/CardsListCommand";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import { SignOutAction } from "./components/SignOutAction";
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
      getItemIcon={(card) => (card.isFavorited ? Icon.Star : Icon.Document)}
      latestSectionTitle={`Cards tagged "${tag}"`}
      loadCards={(input) => searchCards({ ...input, limit: 50, tag })}
      navigationTitle={`Tag: ${tag}`}
      removeTagFilterFromList
      searchBarPlaceholder={`Search within "${tag}" or use type:, sort:oldest`}
    />
  );
}

export default function TagsCommand() {
  const {
    isAuthenticated,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

  const [tags, setTags] = useState<TagSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const { push } = useNavigation();

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }

    if (!isAuthenticated) {
      setTags([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await listTags();
        if (isMounted) {
          setTags(response.items);
        }
      } catch (requestError) {
        if (isMounted) {
          const message = getUserFacingErrorMessage(requestError);
          setError(message);
          setTags([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isCheckingAuth, isAuthenticated]);

  const filteredTags = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return tags;
    }
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalized));
  }, [searchText, tags]);

  if (isCheckingAuth) {
    return <List isLoading navigationTitle="Teak Tags" />;
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail onSignedIn={refreshAuth} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Teak Tags"
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter tags..."
      searchText={searchText}
    >
      {error ? (
        <List.EmptyView
          description="Check your API key and network connection, then retry."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}

      {!(error || isLoading) && filteredTags.length === 0 ? (
        <List.EmptyView
          description={
            searchText.trim()
              ? "Try a different keyword to find tags."
              : "Add tags to your Teak cards to see them listed here."
          }
          icon={Icon.Tag}
          title={searchText.trim() ? "No matching tags" : "No tags yet"}
        />
      ) : null}

      {filteredTags.map((tag) => (
        <List.Item
          accessories={[
            {
              tag: { color: Color.Blue, value: `${tag.count}` },
              tooltip: `${tag.count} card${tag.count === 1 ? "" : "s"}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Eye}
                onAction={() => {
                  push(<TagCardsView tag={tag.name} />);
                }}
                title="View Cards with Tag"
              />
              <Action.CopyToClipboard
                content={tag.name}
                shortcut={{ key: "c", modifiers: ["cmd"] }}
                title="Copy Tag Name"
              />
              <SetApiKeyAction />
              <SignOutAction onSignedOut={refreshAuth} />
            </ActionPanel>
          }
          icon={Icon.Tag}
          key={tag.name}
          subtitle={`${tag.count} card${tag.count === 1 ? "" : "s"}`}
          title={tag.name}
        />
      ))}
    </List>
  );
}
