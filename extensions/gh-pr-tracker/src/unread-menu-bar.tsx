import { MenuBarExtra, Icon, launchCommand, LaunchType, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchPRsWithActivity, getFetchLimits } from "./api";
import { loadCachedPRs, saveCachedPRs } from "./cache";
import { loadSeen, saveSeen } from "./seen";
import { loadEventFilters } from "./event-filters";
import { computePrsWithUnseen, toMenuBarPrs, type PRWithUnseen, type MenuBarPr } from "./utils";

const MENU_ICON = Icon.Bell;

type MenuBarContext = { source?: string; items?: MenuBarPr[] };

function truncateTitle(title: string, max = 40): string {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

/** Compute the unread-PR list from the shared cache without hitting the network. */
async function loadFromCache(): Promise<PRWithUnseen[]> {
  const [prs, seen, filters] = await Promise.all([loadCachedPRs(), loadSeen(), loadEventFilters()]);
  if (!prs) return [];
  return computePrsWithUnseen(prs, seen, filters).slice(0, getFetchLimits().maxUnread);
}

/** Fetch fresh data, update the shared cache/seen, and compute the unread-PR list. */
async function fetchAndCompute(): Promise<PRWithUnseen[]> {
  const seen = await loadSeen();
  const filters = await loadEventFilters();
  const { prs, activeKeys } = await fetchPRsWithActivity({ seen, filters });
  await saveSeen(seen, new Set(activeKeys)); // prune seen entries for closed PRs (full open set)
  await saveCachedPRs(prs); // shared cache — benefits the main command
  return computePrsWithUnseen(prs, seen, filters).slice(0, getFetchLimits().maxUnread);
}

/** Open the main command with this PR expanded and all others collapsed. */
async function openFocused(key: string): Promise<void> {
  try {
    await launchCommand({
      name: "unread-updates",
      type: LaunchType.UserInitiated,
      context: { focusPrKey: key },
    });
  } catch {
    // main command may be unavailable; ignore
  }
}

/** Open the main command normally — all PRs collapsed, default selection. */
async function openAll(): Promise<void> {
  try {
    await launchCommand({ name: "unread-updates", type: LaunchType.UserInitiated });
  } catch {
    // main command may be unavailable; ignore
  }
}

export default function Command(props: LaunchProps<{ launchContext?: MenuBarContext }>) {
  // The view command pushes a precomputed, lean list on every refresh. When present we render
  // straight from it with isLoading=false, so Raycast captures the updated menu bar within the
  // short background-launch window. An async cache read here would race that window and the
  // badge would keep its stale value (especially in Store builds, where the window is tighter).
  const contextItems = props.launchContext?.items;
  const hasContextItems = contextItems !== undefined;
  const skipFetch = props.launchContext?.source === "view-refresh";
  const [cached, setCached] = useState<MenuBarPr[] | undefined>(undefined);

  // Seed instant render from the shared cache (only when the caller didn't push a list).
  useEffect(() => {
    if (hasContextItems) return;
    loadFromCache().then((l) => setCached(toMenuBarPrs(l)));
  }, [hasContextItems]);

  const { data, isLoading } = usePromise(
    async (skip: boolean) => toMenuBarPrs(skip ? await loadFromCache() : await fetchAndCompute()),
    [skipFetch],
    {
      execute: !hasContextItems,
      onError: () => {
        // Background command: no toast UI. Keep any stale cached data; retry next interval.
      },
    },
  );

  const list = hasContextItems ? contextItems : (data ?? cached);
  const loading = hasContextItems ? false : isLoading;

  // Nothing to show yet: while a fetch is in flight, keep the command alive with a bare
  // loading item (never a "0" badge or empty menu); once settled, hide the item entirely
  // (zero unread, or error with no cache — retry on the next interval).
  if (!list || list.length === 0) {
    return loading ? <MenuBarExtra isLoading icon={MENU_ICON} /> : null;
  }

  const count = list.length;

  return (
    <MenuBarExtra
      isLoading={loading}
      icon={MENU_ICON}
      title={String(count)}
      tooltip={`${count} pull request${count !== 1 ? "s" : ""} with unread changes`}
    >
      <MenuBarExtra.Section title={`${count} PR${count !== 1 ? "s" : ""} with unread changes`}>
        {list.slice(0, 5).map((item) => (
          <MenuBarExtra.Item
            key={item.key}
            title={`#${item.number} — ${truncateTitle(item.title)}`}
            subtitle={`${item.repo.split("/").pop() ?? item.repo} · ${item.unseenCount} update${item.unseenCount !== 1 ? "s" : ""}`}
            onAction={() => openFocused(item.key)}
          />
        ))}
        {count > 5 && (
          <MenuBarExtra.Item
            key="show-all"
            icon={Icon.Ellipsis}
            title={`Show all ${count} unread PRs…`}
            onAction={openAll}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
