import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { PRListDetail } from "./components/pr-list-detail";
import { RequireGh } from "./components/require-gh";
import { SamlBanner } from "./components/saml-banner";
import { SetupRequired } from "./components/setup-required";
import { PRDetailView } from "./components/pr-detail";
import { ReviewThreads } from "./components/review-threads";
import { SettingsView } from "./components/settings/settings-view";
import { Timeline } from "./components/timeline";
import { useCategoryPRs, useConfig, useViewer } from "./hooks";
import { withAuthorIgnored } from "./lib/config";
import { statusFromError } from "./lib/gh-status";
import {
  agingOf,
  describeDuration,
  describeSummary,
  elapsedSince,
  SORTS,
  sortBy,
  summarize,
  type SortKey,
} from "./lib/aging";
import { avatar, diffStat, relativeTime, stalenessStyle, statusIcon } from "./lib/format";
import { markAllSeen, markSeen } from "./lib/seen";
import { buildCategories } from "./lib/tabs";
import type { PullRequest } from "./lib/types";

export default function Command() {
  // Nothing below is mounted until the GitHub CLI is installed, authenticated,
  // and reachable.
  return (
    <RequireGh>
      <PullRequests />
    </RequireGh>
  );
}

function PullRequests() {
  const { config, update, revalidate: revalidateConfig } = useConfig();
  const { data: viewer, isLoading: viewerLoading, error: viewerError, revalidate: revalidateViewer } = useViewer();
  const [categoryId, setCategoryId] = useState<string>();
  const [showingDetail, setShowingDetail] = useCachedState("pr-list-detail", false);
  const [sortKey, setSortKey] = useCachedState<SortKey>("pr-list-sort", "activity");

  const categories = useMemo(() => (viewer ? buildCategories(config, viewer) : []), [config, viewer]);
  const category = categories.find((c) => c.id === categoryId) ?? categories[0];

  const { data: result, isLoading: prsLoading, revalidate: revalidatePRs } = useCategoryPRs(category, viewer, config);
  const samlRefusal = result?.saml;
  const lastFetched = result?.fetchedAt;
  const prs = useMemo(() => sortBy(result?.prs ?? [], sortKey), [result?.prs, sortKey]);

  // The gate passed, so this is a mid-session failure: an expired token, or
  // the network dropping out.
  if (viewerError) {
    return <SetupRequired status={statusFromError(viewerError)} onRecheck={revalidateViewer} />;
  }

  const isLoading = viewerLoading || prsLoading;

  function refreshAll() {
    revalidateConfig();
    revalidateViewer();
    revalidatePRs();
  }

  async function ignoreAuthor(login: string) {
    await update(withAuthorIgnored(config, login));
    await showToast({
      style: Toast.Style.Success,
      title: `Hiding @${login}`,
      message: "Undo it from Configure GH Review",
    });
  }

  async function openAndMarkSeen(pr: PullRequest) {
    await markSeen(pr);
    revalidatePRs();
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && prs.length > 0}
      navigationTitle={
        lastFetched
          ? `Pull Requests · ${SORTS.find((s) => s.key === sortKey)?.title.toLowerCase()} · updated ${relativeTime(lastFetched)} ago`
          : "Pull Requests"
      }
      searchBarPlaceholder={category ? `Search ${category.title.toLowerCase()}…` : "Search pull requests…"}
      searchBarAccessory={
        categories.length > 0 ? (
          // Uncontrolled on purpose: storeValue restores the category you last
          // used, and Raycast reports it back through onChange on mount.
          <List.Dropdown tooltip="Category" storeValue onChange={setCategoryId}>
            <List.Dropdown.Section title="Categories">
              {categories
                .filter((c) => c.builtin)
                .map((c) => (
                  <List.Dropdown.Item
                    key={c.id}
                    value={c.id}
                    title={c.title}
                    icon={{ source: c.icon, tintColor: c.color }}
                  />
                ))}
            </List.Dropdown.Section>
            <List.Dropdown.Section title="Saved Filters">
              {categories
                .filter((c) => !c.builtin)
                .map((c) => (
                  <List.Dropdown.Item
                    key={c.id}
                    value={c.id}
                    title={c.title}
                    icon={{ source: c.icon, tintColor: c.color }}
                  />
                ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={category ? { source: category.icon, tintColor: category.color } : Icon.MagnifyingGlass}
        title={isLoading ? "Loading pull requests…" : emptyTitle(categories.length, category?.title)}
        description={isLoading ? undefined : emptyDescription(categories.length)}
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Gear} title="Configure GH Review" target={<SettingsView />} onPop={refreshAll} />
            <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={refreshAll} />
          </ActionPanel>
        }
      />

      {samlRefusal ? <SamlBanner refusal={samlRefusal} onRecheck={refreshAll} /> : null}

      {category ? (
        <List.Section title={category.title} subtitle={describeSummary(summarize(prs)) || undefined}>
          {prs.map((pr) => (
            <List.Item
              key={`${pr.repository}#${pr.number}`}
              icon={statusIcon(pr)}
              title={pr.title}
              subtitle={`${pr.repository} #${pr.number}`}
              keywords={[pr.repository, pr.author, `#${pr.number}`, ...pr.labels.map((l) => l.name)]}
              // With the pane open the row has far less width, so drop the
              // accessories the pane already shows in full.
              accessories={showingDetail ? compactAccessories(pr) : accessories(pr)}
              detail={<PRListDetail pr={pr} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Sidebar}
                      title="Show Details"
                      target={<PRDetailView pr={pr} onChange={revalidatePRs} />}
                      onPush={() => openAndMarkSeen(pr)}
                    />
                    {/* When something is waiting on you, the useful destination
                        is that comment — not the top of a long pull request. */}
                    {pr.awaitingUrl ? (
                      <Action.OpenInBrowser
                        icon={Icon.Reply}
                        title="Open the Comment Awaiting You"
                        url={pr.awaitingUrl}
                        onOpen={() => openAndMarkSeen(pr)}
                      />
                    ) : null}
                    <Action.OpenInBrowser
                      title={pr.awaitingUrl ? "Open Pull Request" : "Open in Browser"}
                      url={pr.url}
                      onOpen={() => openAndMarkSeen(pr)}
                    />
                    <Action.Push
                      icon={Icon.SpeechBubbleActive}
                      title="Review Threads"
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      target={<ReviewThreads pr={pr} onChange={revalidatePRs} />}
                      onPush={() => openAndMarkSeen(pr)}
                    />
                    <Action.Push
                      icon={Icon.Clock}
                      title="Timeline"
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      target={<Timeline pr={pr} />}
                      onPush={() => openAndMarkSeen(pr)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={pr.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard title="Copy Reference" content={`${pr.repository}#${pr.number}`} />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Checkmark}
                      title="Mark as Seen"
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={() => openAndMarkSeen(pr)}
                    />
                    <Action
                      icon={Icon.Checkmark}
                      title="Mark All as Seen"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                      onAction={async () => {
                        await markAllSeen(prs);
                        revalidatePRs();
                      }}
                    />
                    {pr.author ? (
                      <Action
                        icon={Icon.EyeDisabled}
                        title={`Ignore @${pr.author}`}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                        onAction={() => ignoreAuthor(pr.author)}
                      />
                    ) : null}
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      icon={Icon.Sidebar}
                      title={showingDetail ? "Hide Detail Pane" : "Show Detail Pane"}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => setShowingDetail((current) => !current)}
                    />
                    {/* No shortcut: every sensible modifier combination here
                        collides with a Raycast reserved or common binding, and
                        sorting is an occasional action. ⌘K reaches it. */}
                    <ActionPanel.Submenu icon={Icon.ArrowDown} title="Sort">
                      {SORTS.map((sort) => (
                        <Action
                          key={sort.key}
                          icon={sort.key === sortKey ? Icon.Checkmark : Icon.Circle}
                          title={sort.title}
                          onAction={() => setSortKey(sort.key)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <Action
                      icon={Icon.ArrowClockwise}
                      title="Refresh"
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={refreshAll}
                    />
                    <Action.Push
                      icon={Icon.Gear}
                      title="Configure GH Review"
                      target={<SettingsView />}
                      onPop={refreshAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function emptyTitle(categoryCount: number, categoryTitle?: string): string {
  if (categoryCount === 0) return "No categories configured";
  return categoryTitle ? `Nothing in “${categoryTitle}”` : "Nothing to review";
}

function emptyDescription(categoryCount: number): string {
  if (categoryCount === 0) {
    return "Turn the built-in categories back on, or add a saved filter, from Configure GH Review.";
  }
  return "You're all caught up. Try another category, or widen your org scope in the settings.";
}

/**
 * A trimmed accessory set for when the detail pane is open and the row is
 * narrow. Only the two things the pane can't convey at a glance survive:
 * whether it's new, and whether it's waiting on you.
 */
function compactAccessories(pr: PullRequest): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  if (pr.newSince) items.push({ icon: { source: Icon.Dot, tintColor: Color.Orange }, tooltip: "New activity" });
  if (pr.awaitingReply > 0) {
    items.push({ tag: { value: `↩ ${pr.awaitingReply}`, color: Color.Blue }, tooltip: "Awaiting your reply" });
  }
  items.push({ text: relativeTime(pr.lastActivity) });
  return items;
}

/** The right-hand signals on a list row: new activity, replies owed, threads, size, age. */
function accessories(pr: PullRequest): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];

  if (pr.newSince) {
    items.push({ tag: { value: "NEW", color: Color.Orange }, tooltip: "Activity since you last looked" });
  }
  if (pr.awaitingReply > 0) {
    const waited = pr.awaitingSince ? ` for ${describeDuration(elapsedSince(pr.awaitingSince))}` : "";
    items.push({
      tag: { value: `↩ ${pr.awaitingReply}`, color: Color.Blue },
      tooltip: pr.latestReplier
        ? `Awaiting your reply${waited} — last word from @${pr.latestReplier}`
        : `Awaiting your reply${waited}`,
    });
  }
  // Only shout about age once it's actually worth acting on.
  const aging = agingOf(pr);
  if (aging.level !== "fresh") {
    const style = stalenessStyle(aging.level);
    items.push({
      tag: { value: style.label, color: style.color },
      tooltip:
        `Open ${describeDuration(elapsedSince(pr.createdAt))} · quiet for ${describeDuration(elapsedSince(pr.lastActivity))}` +
        (aging.waitingDays !== undefined
          ? ` · waiting on you ${describeDuration(elapsedSince(pr.awaitingSince))}`
          : ""),
    });
  }
  if (pr.unresolved > 0) {
    items.push({ text: `${pr.unresolved}!`, tooltip: `${pr.unresolved} unresolved review threads` });
  }
  if (pr.comments > 0) {
    items.push({ icon: Icon.SpeechBubble, text: String(pr.comments), tooltip: `${pr.comments} comments` });
  }
  items.push({ text: diffStat(pr), tooltip: `${pr.changedFiles} files changed` });
  items.push({ text: relativeTime(pr.lastActivity), tooltip: `Last activity ${relativeTime(pr.lastActivity)} ago` });
  if (pr.author) {
    items.push({ icon: avatar(pr.author), tooltip: `@${pr.author}` });
  }
  return items;
}
