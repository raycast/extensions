import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Appearance, Guest, getAppearances, searchGuests, setupUrl, withSource } from "./api";

const PAGE_SIZE = 20;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const ready = query.length >= 2;

  const { data: guests, isLoading } = useCachedPromise((q: string) => searchGuests(q), [query], {
    execute: ready,
    keepPreviousData: true,
    onError: (error) => showFailureToast(error, { title: "Couldn't search GuestVine" }),
  });

  return (
    <List
      isLoading={ready && isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a podcast guest by name…"
      throttle
    >
      {!ready ? (
        <List.EmptyView
          icon={Icon.Microphone}
          title="Follow People, Not Shows"
          description="Type a name to see the podcasts they've been a guest on"
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matches"
          description="Try the full name or another spelling"
        />
      )}
      {ready &&
        (guests ?? []).map((guest) => (
          <List.Item
            key={guest.page_url}
            icon={Icon.Person}
            title={guest.name}
            subtitle={guest.context ?? undefined}
            accessories={[
              {
                text: `${guest.shows_guested_on} ${guest.shows_guested_on === 1 ? "show" : "shows"}`,
                tooltip: "Distinct shows guested on",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Show Appearances" icon={Icon.List} target={<AppearancesList guest={guest} />} />
                <FollowAction guest={guest} />
                <Action.OpenInBrowser title="Open GuestVine Page" url={withSource(guest.page_url)} />
                <Action.CopyToClipboard
                  title="Copy GuestVine Link"
                  content={guest.page_url}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function FollowAction({ guest }: { guest: Guest }) {
  return (
    <Action.OpenInBrowser
      title="Get New Appearances in My Podcast App"
      icon={Icon.Bell}
      url={setupUrl(guest.page_url)}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
}

function AppearancesList({ guest }: { guest: Guest }) {
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, isLoading, pagination } = useCachedPromise(
    (name: string) =>
      async ({ page }: { page: number }) => {
        const result = await getAppearances(name, { limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        return { data: result.appearances, hasMore: result.appearances.length === PAGE_SIZE };
      },
    [guest.name],
    { onError: (error) => showFailureToast(error, { title: "Couldn't load appearances" }) },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={showingDetail}
      navigationTitle={guest.name}
      searchBarPlaceholder={`Filter ${guest.name}'s appearances by show or episode…`}
    >
      <List.EmptyView
        icon={Icon.Microphone}
        title="No Guest Appearances Yet"
        description="New ones are picked up as they're published. Press ⌘N to get them in your podcast app."
        actions={
          <ActionPanel>
            <FollowAction guest={guest} />
            <Action.OpenInBrowser title="Open GuestVine Page" url={withSource(guest.page_url)} />
          </ActionPanel>
        }
      />
      {(data ?? []).map((appearance, index) => (
        <List.Item
          key={`${index}-${appearance.audio_url ?? appearance.episode}`}
          icon={Icon.Microphone}
          title={appearance.episode}
          subtitle={showingDetail ? undefined : appearance.show}
          keywords={[appearance.show]}
          accessories={showingDetail || !appearance.published ? [] : [{ text: formatDate(appearance.published) }]}
          detail={<AppearanceDetail appearance={appearance} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {appearance.audio_url && <Action.OpenInBrowser title="Open Episode" url={appearance.audio_url} />}
                <FollowAction guest={guest} />
                <Action.OpenInBrowser
                  title="Open GuestVine Page"
                  url={withSource(guest.page_url)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  title={showingDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                  onAction={() => setShowingDetail((v) => !v)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {appearance.audio_url && (
                  <Action.CopyToClipboard
                    title="Copy Episode Link"
                    content={appearance.audio_url}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy GuestVine Link"
                  content={guest.page_url}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AppearanceDetail({ appearance }: { appearance: Appearance }) {
  const markdown = `## ${escapeMarkdown(appearance.episode)}\n\n${escapeMarkdown(appearance.description ?? "")}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Show" text={appearance.show} />
          {appearance.published && (
            <List.Item.Detail.Metadata.Label title="Published" text={formatDate(appearance.published)} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** "2026-09-03" → "Sep 3, 2026", read as a calendar date (no timezone shift). */
function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]#<>])/g, "\\$1");
}
