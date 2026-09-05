import { Color, Icon, Keyboard, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { fetchCategory } from "./hooks";
import { loadConfig } from "./lib/config";
import { relativeTime } from "./lib/format";
import { checkGhStatus, isBlocked, resetGhCaches, type GhStatus } from "./lib/gh-status";
import { fetchViewer } from "./lib/github";
import { menuBarLimit, menuBarPrefs } from "./lib/preferences";
import { markAllSeen } from "./lib/seen";
import { buildCategories, type Category } from "./lib/tabs";
import type { PullRequest } from "./lib/types";

type MenuBarData = {
  /** The categories shown in the dropdown, each with its results. */
  groups: { category: Category; prs: PullRequest[] }[];
  /** The number driving the menu bar title. */
  count: number;
  /** Rows across all groups, before de-duplication. */
  total: number;
  /** When this data was fetched (ISO 8601). */
  checkedAt: string;
  /** Set when the GitHub CLI isn't ready; the menu shows setup guidance instead. */
  setup?: GhStatus;
};

/** A compact signal line for a menu bar row: repo, age, and what's outstanding. */
function subtitleFor(pr: PullRequest): string {
  const bits = [`${pr.repository} #${pr.number}`, relativeTime(pr.lastActivity)];
  if (pr.awaitingReply > 0) bits.push(`↩ ${pr.awaitingReply}`);
  else if (pr.unresolved > 0) bits.push(`${pr.unresolved} unresolved`);
  if (pr.isDraft) bits.push("draft");
  return bits.join(" · ");
}

/** Which categories the menu bar loads, per the command preference. */
function selectedIds(mode: string): string[] {
  switch (mode) {
    case "review-requested":
      return ["review-requested"];
    case "awaiting-reply":
      return ["awaiting-reply"];
    case "my-prs":
      return ["my-prs"];
    default:
      return ["review-requested", "awaiting-reply"];
  }
}

async function load(mode: string): Promise<MenuBarData> {
  // Same gate as the view commands: without a working CLI there is nothing to
  // count, so say so rather than showing a misleading zero.
  const status = await checkGhStatus();
  if (isBlocked(status)) {
    return { groups: [], count: 0, total: 0, checkedAt: new Date().toISOString(), setup: status };
  }

  const config = await loadConfig();
  const viewer = await fetchViewer();
  const wanted = selectedIds(mode);

  const categories = buildCategories(config, viewer).filter((c) => wanted.includes(c.id));
  const groups = await Promise.all(
    categories.map(async (category) => ({
      category,
      prs: await fetchCategory(category, viewer.login, config.ignoredAuthors),
    })),
  );

  // A PR can sit in more than one category (needing review *and* a reply), so
  // count distinct pull requests rather than rows.
  const distinct = new Set(groups.flatMap((g) => g.prs.map((pr) => `${pr.repository}#${pr.number}`)));
  return {
    groups,
    count: distinct.size,
    total: groups.reduce((sum, g) => sum + g.prs.length, 0),
    checkedAt: new Date().toISOString(),
  };
}

export default function Command() {
  const { menuBarCategory, hideWhenEmpty } = menuBarPrefs();
  const mode = menuBarCategory ?? "attention";

  const { data, isLoading, error, revalidate } = useCachedPromise(load, [mode], {
    keepPreviousData: true,
  });

  const setup = data?.setup;
  const needsSetup = Boolean(error || setup);
  const count = data?.count ?? 0;
  const lastChecked = data?.checkedAt;
  const inlineLimit = menuBarLimit();

  /** One pull request row, used inline and inside the overflow submenu. */
  const prItem = (categoryId: string, pr: PullRequest) => (
    <MenuBarExtra.Item
      key={`${categoryId}:${pr.repository}#${pr.number}`}
      icon={pr.newSince ? { source: Icon.Dot, tintColor: Color.Orange } : Icon.Circle}
      title={pr.title.length > 60 ? `${pr.title.slice(0, 60)}…` : pr.title}
      subtitle={subtitleFor(pr)}
      tooltip={
        pr.awaitingUrl
          ? `${pr.repository} #${pr.number} — opens @${pr.latestReplier || pr.author}'s comment`
          : `${pr.repository} #${pr.number} — @${pr.author}`
      }
      // Land on the comment that needs an answer when there is one.
      onAction={() => open(pr.awaitingUrl || pr.url)}
    />
  );

  // Never hide the icon while setup is outstanding — a silently missing menu
  // bar item is exactly how someone fails to notice the CLI isn't configured.
  if (hideWhenEmpty && !isLoading && !needsSetup && count === 0) {
    return null;
  }

  const icon = needsSetup
    ? { source: Icon.ExclamationMark, tintColor: Color.Red }
    : count > 0
      ? { source: Icon.Eye, tintColor: Color.Red }
      : Icon.Eye;

  if (needsSetup) {
    const title =
      setup?.state === "not-installed"
        ? "GitHub CLI not installed"
        : setup?.state === "not-authenticated"
          ? "GitHub CLI not authenticated"
          : "Can't reach GitHub";
    const fix = setup?.state === "not-installed" ? "brew install gh" : "gh auth login";

    return (
      <MenuBarExtra icon={icon} isLoading={isLoading} tooltip="GH Review — setup required">
        <MenuBarExtra.Section title={title}>
          <MenuBarExtra.Item
            title={`Run \`${fix}\` in a terminal`}
            subtitle="Then open GH Review for the full walkthrough"
            onAction={() => launchCommand({ name: "pull-requests", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Open Setup Instructions"
            icon={Icon.Info}
            onAction={() => launchCommand({ name: "pull-requests", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="GitHub CLI Homepage"
            icon={Icon.Globe}
            onAction={() => open("https://cli.github.com")}
          />
          <MenuBarExtra.Item
            title="Check Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              resetGhCaches();
              revalidate();
            }}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} title={count > 0 ? String(count) : undefined} tooltip="GH Review">
      {data?.groups.map(({ category, prs }) => {
        const inline = prs.slice(0, inlineLimit);
        const overflow = prs.slice(inlineLimit);
        return (
          <MenuBarExtra.Section key={category.id} title={`${category.title} (${prs.length})`}>
            {prs.length === 0 ? <MenuBarExtra.Item title="Nothing here — you're caught up" /> : null}
            {inline.map((pr) => prItem(category.id, pr))}
            {/* The remainder goes in a submenu rather than a dead "…and N more"
                line, so every pull request stays reachable. */}
            {overflow.length > 0 ? (
              <MenuBarExtra.Submenu icon={Icon.Ellipsis} title={`${overflow.length} more`}>
                {overflow.map((pr) => prItem(category.id, pr))}
              </MenuBarExtra.Submenu>
            ) : null}
          </MenuBarExtra.Section>
        );
      })}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={lastChecked ? `Checked ${relativeTime(lastChecked)} ago` : "Not checked yet"}
          subtitle={data?.total !== undefined ? `${data.total} tracked` : undefined}
          icon={Icon.Clock}
          onAction={() => {
            resetGhCaches();
            revalidate();
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Pull Requests"
          icon={Icon.AppWindowList}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launchCommand({ name: "pull-requests", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Mark All as Seen"
          icon={Icon.Checkmark}
          onAction={async () => {
            await markAllSeen(data?.groups.flatMap((g) => g.prs) ?? []);
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          title="Configure GH Review"
          icon={Icon.Gear}
          onAction={() => launchCommand({ name: "settings", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
