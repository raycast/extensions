import { MenuBarExtra, Icon, launchCommand, LaunchType, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchPRsWithActivity } from "./api";
import { loadCachedPRs, saveCachedPRs } from "./cache";
import { loadSeen, saveSeen } from "./seen";
import { loadEventFilters } from "./event-filters";
import { computePrsWithUnseen, type PRWithUnseen } from "./utils";
import { prKey, type PRWithActivity } from "./types";

const MENU_ICON = Icon.Bell;

type MenuBarContext = { source?: string };

function truncateTitle(title: string, max = 40): string {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

/** Compute the unread-PR list from the shared cache without hitting the network. */
async function loadFromCache(): Promise<PRWithUnseen[]> {
  const [prs, seen, filters] = await Promise.all([loadCachedPRs(), loadSeen(), loadEventFilters()]);
  if (!prs) return [];
  return computePrsWithUnseen(prs, seen, filters);
}

/** Fetch fresh data, update the shared cache/seen, and compute the unread-PR list. */
async function fetchAndCompute(): Promise<PRWithUnseen[]> {
  const prs = await fetchPRsWithActivity();
  const seen = await loadSeen();
  const activePrKeys = new Set(prs.map((pr) => prKey(pr)));
  await saveSeen(seen, activePrKeys); // prune seen entries for closed PRs
  await saveCachedPRs(prs); // shared cache — benefits the main command
  const filters = await loadEventFilters();
  return computePrsWithUnseen(prs, seen, filters);
}

/** Open the main command with this PR expanded and all others collapsed. */
async function openFocused(pr: PRWithActivity): Promise<void> {
  try {
    await launchCommand({
      name: "unread-updates",
      type: LaunchType.UserInitiated,
      context: { focusPrKey: prKey(pr) },
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
  const skipFetch = props.launchContext?.source === "view-refresh";
  const [cached, setCached] = useState<PRWithUnseen[] | undefined>(undefined);

  // Seed instant render from the shared cache.
  useEffect(() => {
    loadFromCache().then(setCached);
  }, []);

  const { data, isLoading } = usePromise(
    async (skip: boolean) => (skip ? loadFromCache() : fetchAndCompute()),
    [skipFetch],
    {
      onError: () => {
        // Background command: no toast UI. Keep any stale cached data; retry next interval.
      },
    },
  );

  const list = data ?? cached;

  // Nothing to show yet: while a fetch is in flight, keep the command alive with a bare
  // loading item (never a "0" badge or empty menu); once settled, hide the item entirely
  // (zero unread, or error with no cache — retry on the next interval).
  if (!list || list.length === 0) {
    return isLoading ? <MenuBarExtra isLoading icon={MENU_ICON} /> : null;
  }

  const count = list.length;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={MENU_ICON}
      title={String(count)}
      tooltip={`${count} pull request${count !== 1 ? "s" : ""} with unread changes`}
    >
      <MenuBarExtra.Section title={`${count} PR${count !== 1 ? "s" : ""} with unread changes`}>
        {list.slice(0, 5).map(({ pr, unseen }) => (
          <MenuBarExtra.Item
            key={prKey(pr)}
            title={`#${pr.number} — ${truncateTitle(pr.title)}`}
            subtitle={`${pr.repo.split("/").pop() ?? pr.repo} · ${unseen.length} update${unseen.length !== 1 ? "s" : ""}`}
            onAction={() => openFocused(pr)}
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
