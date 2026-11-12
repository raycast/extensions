import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { getHeadlines } from "./api/ninety";
import { Headline } from "./api/types";
import { ErrorView } from "./components/ErrorView";
import { HeadlineForm } from "./components/HeadlineForm";
import { TeamDropdown } from "./components/TeamDropdown";
import { useTeams } from "./hooks/useTeams";
import { useUsers } from "./hooks/useUsers";
import { showError } from "./lib/errors";
import { compact, formatDate, htmlToMarkdown } from "./lib/format";
import { NinetyUrls } from "./lib/urls";
import { useAvatar } from "./hooks/useAvatar";

type SortOrder = "newest" | "oldest";

function byCreatedDate(order: SortOrder) {
  return (a: Headline, b: Headline) => {
    const diff = new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime();
    return order === "newest" ? diff : -diff;
  };
}

function headlineMarkdown(headline: Headline) {
  return compact([`## ${headline.title}`, htmlToMarkdown(headline.description)]).join("\n\n");
}

export default function Command() {
  const { avatar, ownerAccessory } = useAvatar();
  const { teams, teamName, error: teamsError, revalidate: retryTeams } = useTeams();
  const { userName } = useUsers();
  const [teamId, setTeamId] = useState("");
  const [cascading, setCascading] = useState(false);
  const [includeDiscussed, setIncludeDiscussed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [sortOrder, setSortOrder] = useCachedState<SortOrder>("headlines-sort", "newest");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (teamId: string, isCascadedMessage: boolean, includeDiscussed: boolean) =>
      getHeadlines({ teamId, isCascadedMessage, includeDiscussed }),
    [teamId, cascading, includeDiscussed],
    {
      execute: !!teamId,
      keepPreviousData: true,
      onError: (error) => {
        showError(error, "Couldn't load Headlines");
      },
    },
  );
  const headlines = [...(data ?? [])].sort(byCreatedDate(sortOrder));
  const kind = cascading ? "Cascading Messages" : "Headlines";

  const createAction = (
    <Action.Push
      title={cascading ? "Create Cascading Message" : "Create Headline"}
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<HeadlineForm defaultTeamId={teamId} defaultCascaded={cascading} onSaved={() => revalidate()} />}
    />
  );

  const toggleActions = (
    <ActionPanel.Section>
      <Action
        title={cascading ? "Show Headlines" : "Show Cascading Messages"}
        icon={cascading ? Icon.Megaphone : Icon.ArrowDown}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "m" },
          Windows: { modifiers: ["ctrl", "shift"], key: "m" },
        }}
        onAction={() => setCascading((v) => !v)}
      />
      <Action
        title={includeDiscussed ? "Hide Discussed" : "Include Discussed"}
        icon={Icon.Eye}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "h" },
          Windows: { modifiers: ["ctrl", "shift"], key: "h" },
        }}
        onAction={() => setIncludeDiscussed((v) => !v)}
      />
      <Action
        title={sortOrder === "newest" ? "Sort Oldest First" : "Sort Newest First"}
        icon={sortOrder === "newest" ? Icon.ArrowUp : Icon.ArrowDown}
        shortcut={{
          macOS: { modifiers: ["cmd", "opt"], key: "s" },
          Windows: { modifiers: ["ctrl", "alt"], key: "s" },
        }}
        onAction={() => setSortOrder((order) => (order === "newest" ? "oldest" : "newest"))}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => revalidate()}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading || (!teamId && !teamsError)}
      isShowingDetail={showDetail && headlines.length > 0}
      searchBarPlaceholder={`Filter ${kind}`}
      searchBarAccessory={<TeamDropdown id="headlines-team" teams={teams} onChange={setTeamId} />}
    >
      {teamsError || error ? (
        <ErrorView
          title={teamsError ? "Couldn't load Teams" : `Couldn't load ${kind}`}
          error={(teamsError ?? error)!}
          onRetry={() => (teamsError ? retryTeams() : revalidate())}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Megaphone}
          title={`No ${kind}`}
          description="Press ⌘N to share one."
          actions={
            <ActionPanel>
              {createAction}
              {toggleActions}
            </ActionPanel>
          }
        />
      )}
      <List.Section
        title={`${kind} · ${sortOrder === "newest" ? "Newest First" : "Oldest First"}`}
        subtitle={String(headlines.length)}
      >
        {headlines.map((headline) => {
          const owner = userName(headline.userId);
          const from = headline.cascadedFromTeamId ? teamName(headline.cascadedFromTeamId) : undefined;
          return (
            <List.Item
              key={headline.id}
              title={headline.title}
              icon={{
                source: headline.isCascadedMessage ? Icon.ArrowDown : Icon.Megaphone,
                tintColor: headline.completed ? Color.SecondaryText : Color.Blue,
              }}
              keywords={compact([owner])}
              accessories={
                showDetail
                  ? undefined
                  : compact<List.Item.Accessory>([
                      headline.completed ? { tag: { value: "Discussed", color: Color.SecondaryText } } : undefined,
                      from ? { icon: Icon.TwoPeople, text: from, tooltip: "Cascaded from" } : undefined,
                      headline.createdDate ? { date: new Date(headline.createdDate) } : undefined,
                      ownerAccessory(owner, headline.userId),
                    ])
              }
              detail={
                <List.Item.Detail
                  markdown={headlineMarkdown(headline)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Owner"
                        text={owner ?? "—"}
                        icon={avatar(owner, headline.userId)}
                      />
                      {from ? <List.Item.Detail.Metadata.Label title="Cascaded From" text={from} /> : null}
                      <List.Item.Detail.Metadata.Label title="Created" text={formatDate(headline.createdDate)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={showDetail ? "Hide Details" : "Show Details"}
                      icon={Icon.Sidebar}
                      onAction={() => setShowDetail((v) => !v)}
                    />
                    <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.headline(headline)} />
                    <Action.CopyToClipboard title="Copy Headline" content={headline.title} />
                    {createAction}
                  </ActionPanel.Section>
                  {toggleActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
