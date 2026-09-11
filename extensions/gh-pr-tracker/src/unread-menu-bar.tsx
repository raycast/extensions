import { MenuBarExtra, Icon, launchCommand, LaunchType, getPreferenceValues, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { fetchPRsWithActivity, getFetchLimits } from "./api";
import { loadCachedPRs, saveCachedPRs } from "./cache";
import { loadSeen, saveSeen } from "./seen";
import { loadEventFilters } from "./event-filters";
import { resolveActivePrFilter } from "./pr-filters";
import { computePrsWithUnseen, toMenuBarPrs, type PRWithUnseen, type MenuBarPr } from "./utils";
import { menuLog as log, getErrorMessage } from "./logger";
import {
  readMenuBarCache,
  writeMenuBarCache,
  isFresh,
  readCommittedCount,
  writeCommittedCount,
} from "./menu-bar-cache";

const MENU_ICON = Icon.Bell;

type MenuBarContext = { source?: string; items?: MenuBarPr[] };

// Raycast's development renderer replays effect setup in the same microtask. This is deliberately
// narrower than an in-flight lock so a later interval or user refresh remains a new request.
let menuMountFetch: Promise<PRWithUnseen[]> | undefined;

function truncateTitle(title: string, max = 40): string {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

/** Compute the unread-PR list from the shared cache without hitting the network. */
async function loadFromCache(): Promise<PRWithUnseen[]> {
  const [prs, seen, filters, prFilter] = await Promise.all([
    loadCachedPRs(),
    loadSeen(),
    loadEventFilters(),
    resolveActivePrFilter(),
  ]);
  if (!prs) return [];
  return computePrsWithUnseen(prs, seen, filters, prFilter).slice(0, getFetchLimits().maxUnread);
}

/** Fetch fresh data, update the shared cache/seen, and compute the unread-PR list. */
async function fetchAndCompute(): Promise<PRWithUnseen[]> {
  if (menuMountFetch) return menuMountFetch;

  const request = (async () => {
    const seenBeforeFetch = await loadSeen();
    const filters = await loadEventFilters();
    const prFilter = await resolveActivePrFilter();
    const { prs, activeKeys, activeKeysComplete } = await fetchPRsWithActivity({
      seen: seenBeforeFetch,
      filters,
      prFilter,
      source: "menu-bar",
    });
    // RELOAD after the fetch. The fetch can take many seconds, and writing back the snapshot
    // taken before it would erase any mark-as-read the user performed meanwhile — including the
    // `fullySeenAt` watermark, which would then re-fetch that PR's full activity forever. The
    // view command has always reloaded here; this path did not, and silently lost those actions.
    const seen = await loadSeen();
    const freshFilters = await loadEventFilters();
    const freshPrFilter = await resolveActivePrFilter();
    // Prune closed-PR seen state only when the key set is the complete open set — see api.ts.
    await saveSeen(seen, activeKeysComplete ? new Set(activeKeys) : undefined);
    await saveCachedPRs(prs); // shared cache — benefits the main command
    const list = computePrsWithUnseen(prs, seen, freshFilters, freshPrFilter).slice(0, getFetchLimits().maxUnread);
    // Publish for the next synchronous seed (this command's own next launch, and the view's).
    writeMenuBarCache(toMenuBarPrs(list));
    return list;
  })();
  menuMountFetch = request;
  queueMicrotask(() => {
    if (menuMountFetch === request) menuMountFetch = undefined;
  });
  return request;
}

/** Open the main command with this PR expanded and all others collapsed. */
async function openFocused(key: string): Promise<void> {
  try {
    await launchCommand({
      name: "unread-updates",
      type: LaunchType.UserInitiated,
      context: { focusPrKey: key },
    });
  } catch (error) {
    log.error("Failed to open View Pull Requests", { prKey: key, error: getErrorMessage(error) });
  }
}

/** Open the main command normally — all PRs collapsed, default selection. */
async function openAll(): Promise<void> {
  try {
    await launchCommand({ name: "unread-updates", type: LaunchType.UserInitiated });
  } catch (error) {
    log.error("Failed to open View Pull Requests", { error: getErrorMessage(error) });
  }
}

export default function Command(props: LaunchProps<{ launchContext?: MenuBarContext }>) {
  // Seed SYNCHRONOUSLY from the shared Cache. Raycast commits a menu-bar render only once
  // isLoading settles to false, and a background launch gets a short window — the previous
  // useEffect + async LocalStorage read resolved AFTER that window, so the badge kept its stale
  // value. A Cache read in a useState initializer is correct on the first render.
  // See docs/PERFORMANCE-FINDINGS.md §1 and §5.3.
  const [seeded] = useState(readMenuBarCache);
  const { alwaysShowMenuBar } = getPreferenceValues<Preferences>();

  // The view command may still push a precomputed list; honour it when present.
  const contextItems = props.launchContext?.items;
  const hasContextItems = contextItems !== undefined;

  // A fresh synchronous seed is sufficient on its own, so DON'T RUN THE HOOK AT ALL.
  //
  // This is the load-bearing line. `usePromise` starts at `isLoading: true` and runs its async
  // body even when a cached value exists — and Raycast only commits a menu-bar render once
  // `isLoading` settles to false. So merely *seeding* state synchronously does not help: the
  // first committed render would still wait on an async LocalStorage read and miss the
  // background-launch window, which is the original stale-badge bug (§1). Gating `execute`
  // is what makes the first render both correct AND already-settled.
  //
  // An EMPTY fresh cache counts as usable. It is the authoritative "you are caught up" answer —
  // rejecting it (by also requiring items.length > 0) started a redundant network fetch, and if
  // that fetch failed there was then nothing to commit, so the command returned null and left the
  // previous non-zero badge on screen. The zero was known all along.
  const seedIsUsable = !hasContextItems && isFresh(seeded);

  // `usePromise` revalidates when its argument array changes; this callback receives `skip`
  // through that array, so it deliberately has no component-state dependencies.
  const loadList = useCallback(
    async (skip: boolean) => toMenuBarPrs(skip ? await loadFromCache() : await fetchAndCompute()),
    [],
  );

  const { data, isLoading } = usePromise(loadList, [false], {
    execute: !hasContextItems && !seedIsUsable,
    onError: (error) => {
      // Background command: no toast UI is available, so a failure here is otherwise
      // indistinguishable from "all caught up". Log it and keep any stale cached data;
      // the next 5-minute interval retries.
      log.error("Menu bar refresh failed", { error: getErrorMessage(error) });
    },
  });

  // Freshest wins: a pushed list > this launch's fetch > the synchronous cache seed.
  const list = hasContextItems ? contextItems : (data ?? seeded?.items);
  // When either a pushed list or a fresh seed is in hand, the render is already final —
  // report settled so Raycast commits it immediately rather than waiting on a hook that
  // never ran.
  const loading = hasContextItems || seedIsUsable ? false : isLoading;

  if (!list || list.length === 0) {
    // Still fetching: keep the command alive with a bare loading item — never a "0" badge.
    if (loading) return <MenuBarExtra isLoading icon={MENU_ICON} />;

    // Settled with nothing unread.
    //
    // `null` hides the item, which is the default and intended behaviour: a notification bell
    // that is always present is noisy for a single extension, so it should appear only when it
    // has something to report.
    //
    // The catch is that `null` alone does not reliably CLEAR a badge that was already committed —
    // Raycast restores menu bar items from its database rather than re-executing the command, so
    // a previous non-zero count can survive. Committing an empty render first, then hiding on the
    // following launch, is what makes the count actually go away.
    //
    // So: commit an empty state when this launch produced a result AND a count is currently on
    // screen. The COMMITTED count is the authority here, never the cached payload — on the
    // mark-as-read path the view writes an empty payload *before* launching this command, so the
    // payload already reads as empty and would wrongly report "nothing to clear", leaving the old
    // badge up indefinitely. That is the principal path this fix exists for.
    const settledWithResult = hasContextItems || data !== undefined || seedIsUsable;
    if (!settledWithResult) return null;

    const needsClearing = readCommittedCount() > 0;
    if (!alwaysShowMenuBar && !needsClearing) return null;
    writeCommittedCount(0);

    return (
      <MenuBarExtra icon={MENU_ICON} tooltip={alwaysShowMenuBar ? "No pull requests with unread changes" : undefined} />
    );
  }

  const count = list.length;
  // Record what is going on screen so a later empty launch knows it must clear it.
  writeCommittedCount(count);

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
