import {
  Color,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { getAccessToken, useCachedPromise, withAccessToken } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AppErrorKind, errorText, toAppError } from "./core/errors";
import { toSections } from "./core/filtering";
import { clock, grouped } from "./core/format";
import { MenuSection, Snapshot, Social, displayName, profileURL, rateLimitFraction, sectionItems } from "./core/models";
import { Queries, buildQueries } from "./core/query";
import { SeenState, emptySeenState, isSeen, markFirstRunDone, markNotified, markSeen, unseenCount } from "./core/seen";
import { Settings, rateLimitShows, visibleSections } from "./core/settings";
import { fetchSnapshot } from "./github/client";
import { github } from "./oauth";
import { settings as preferenceSettings } from "./preferences";
import { applyScope, isEmptyScopeOverride } from "./core/scope";
import { commitSeenState, loadSeenState } from "./state/seenStore";
import { loadScopeOverride } from "./state/scopeStore";
import { MENU_BAR_ICON, avatarIcon, gaugeIcon } from "./ui/icons";
import { EmptyState, RowContext, SectionBlock } from "./ui/rows";

/** Manifest names, used to relaunch commands. */
const COMMAND_NAME = "ghbar";
const SCOPE_COMMAND = "configure-scope";

interface Payload {
  /** Settings AFTER the scope selection is applied. */
  settings: Settings;
  queries: Queries;
  /** Null when the allow-list is empty and no request was made. */
  snapshot: Snapshot | null;
  seen: SeenState;
  fetchedAt: string;
}

/**
 * Queries derived from the preferences, passed as the CACHE KEY: changing a
 * preference changes the key, so the command refetches instead of showing a
 * stale result.
 *
 * The "Configure Scope" selection cannot join the key — `LocalStorage` is
 * async and the key must be synchronous — so it is read inside the fetcher,
 * and that command nudges this one with `launchCommand` when it changes.
 */
const PREFERENCE_QUERIES: Queries = buildQueries(preferenceSettings);

function Command() {
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    // The parameter is both the cache key and the ready-made value used when
    // there is no scope selection; `useCachedPromise` derives the key from the
    // arguments, so the queries have to travel through here.
    async (preferenceQueries: Queries): Promise<Payload> => {
      const { token } = getAccessToken();

      // The scope selection layers on top of the preferences.
      const override = await loadScopeOverride();
      const effective = applyScope(preferenceSettings, override);
      const queries = isEmptyScopeOverride(override) ? preferenceQueries : buildQueries(effective);

      const decodedSeen = await loadSeenState();
      const base = { settings: effective, queries, seen: decodedSeen.state };

      // Allow-list on but empty: an unscoped search would return everything,
      // so no request is made. The menu says "no repositories selected"
      // rather than "no work waiting".
      if (queries.allowListEmpty) {
        return { ...base, snapshot: null, fetchedAt: new Date().toISOString() };
      }

      const [snapshot, decoded] = await Promise.all([fetchSnapshot(token, queries), loadSeenState()]);

      // Everything starts UNREAD on first run, so the badge is populated and
      // "Mark All as Seen" has something to do.
      const live = new Set(
        [
          ...snapshot.prs,
          ...snapshot.issues,
          ...snapshot.review,
          ...snapshot.changesRequested,
          ...snapshot.myPullRequests,
        ].map((item) => item.url),
      );
      // Every current item is marked ANNOUNCED but not seen. v1 sends no
      // notifications, so "which are new" is not computed yet; the set is
      // still filled so that adding them later cannot flood on first run.
      const [bootstrapped] = markFirstRunDone(decoded.state);
      const withNotifications = markNotified(bootstrapped, [...live]);

      // Guarded write: re-reads and merges, so marks the user made during
      // this round-trip are not clobbered. Pruning happens inside.
      const committed = await commitSeenState(withNotifications, live);

      return { ...base, settings: effective, queries, snapshot, seen: committed, fetchedAt: new Date().toISOString() };
    },
    [PREFERENCE_QUERIES],
    {
      // The cached menu renders instantly while the request runs behind it.
      keepPreviousData: true,
    },
  );

  // Preferences apply until the first fetch lands, then the effective settings.
  const settings = data?.settings ?? preferenceSettings;
  const queries = data?.queries ?? PREFERENCE_QUERIES;

  // Local state so the tint changes immediately while the menu is open; the
  // badge needs a background relaunch, which is best-effort.
  const [localSeen, setLocalSeen] = useState<SeenState | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const seenState = localSeen ?? data?.seen ?? emptySeenState();

  const sections = useMemo<MenuSection[]>(
    () => (data?.snapshot ? toSections(data.snapshot, settings) : []),
    [data, settings],
  );

  const allItems = useMemo(() => sections.flatMap(sectionItems), [sections]);
  const unseen = unseenCount(seenState, allItems);

  const errors = collectErrors(error, queries.allowListEmpty, queries.filtersDropped);
  const viewer = data?.snapshot?.viewer;
  const social = data?.snapshot?.social;
  const rateLimit = data?.snapshot?.rateLimit;

  async function markUrlsSeen(urls: string[]) {
    const next = markSeen(seenState, urls, new Date());
    setLocalSeen(next);

    // `isLoading` MUST be true for the duration of the write.
    //
    // Raycast unloads a menu-bar command as soon as `isLoading` goes false,
    // and at click time the data is already loaded — so an async `onAction`
    // has no guaranteed lifetime and the write can be killed before it
    // reaches disk. This flag keeps the process alive until it lands.
    setIsMutating(true);
    try {
      const committed = await commitSeenState(next);

      // The cached payload has to move too, or the next launch renders from
      // the cache with the OLD seen state and everything looks unread again.
      await mutate(Promise.resolve(), {
        optimisticUpdate: (current) => (current ? { ...current, seen: committed } : current),
        shouldRevalidateAfter: false,
      }).catch(() => undefined);

      // The badge only changes when the command runs again. This is the
      // documented route but not guaranteed; the next interval recovers it.
      try {
        await launchCommand({ name: COMMAND_NAME, type: LaunchType.Background });
      } catch {
        /* the next refresh recovers it */
      }
    } finally {
      setIsMutating(false);
    }
  }

  const context: RowContext = {
    showOwner: settings.accounts.length > 1 || settings.organizations.length > 0,
    isSeen: (url) => isSeen(seenState, url),
    maxRows: settings.maxRowsPerSection,
    now: new Date(),
    onOpen: async (url) => {
      await open(url);
      await markUrlsSeen([url]);
    },
  };

  return (
    <MenuBarExtra
      icon={MENU_BAR_ICON}
      title={unseen > 0 ? String(unseen) : undefined}
      tooltip={`GHBar · ${allItems.length} open ${allItems.length === 1 ? "item" : "items"}`}
      isLoading={isLoading || isMutating}
    >
      {viewer && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={displayName(viewer)}
            subtitle={`@${viewer.login}`}
            icon={avatarIcon(viewer.avatarURL)}
            onAction={() => open(profileURL(viewer))}
          />
          {/* One line under the name. As a separate three-row section a
              narrow table looked unbalanced inside a wide menu. */}
          {social && <MenuBarExtra.Item title={socialText(social)} icon={Icon.Star} />}
        </MenuBarExtra.Section>
      )}

      {errors.length > 0 && (
        <MenuBarExtra.Section>
          {errors.map((kind) => (
            <MenuBarExtra.Item
              key={kind.type}
              title={errorText(kind, clock)}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            />
          ))}
          {/* When stale data is shown, say how stale. */}
          {data && <MenuBarExtra.Item title={`Last updated ${clock(new Date(data.fetchedAt))}`} />}
        </MenuBarExtra.Section>
      )}

      {sections.map((section) => (
        <SectionBlock key={section.kind} section={section} context={context} />
      ))}

      {sections.length === 0 && errors.length === 0 && data?.snapshot && (
        <EmptyState
          organizations={settings.organizations}
          repositoryFilterActive={settings.repoList.length > 0}
          allSectionsHidden={visibleSections(settings).size === 0}
        />
      )}

      {rateLimit && rateLimitShows(settings.rateLimitVisibility, rateLimitFraction(rateLimit)) && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Rate limit ${grouped(rateLimit.remaining)} / ${grouped(rateLimit.limit)}`}
            subtitle={`resets ${clock(new Date(rateLimit.resetAt))}`}
            icon={gaugeIcon(rateLimitFraction(rateLimit))}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open GitHub"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(viewer ? profileURL(viewer) : "https://github.com")}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          // Keeps the quota reachable even when its row is hidden.
          tooltip={rateLimit ? `Rate limit ${grouped(rateLimit.remaining)} / ${grouped(rateLimit.limit)}` : undefined}
          onAction={() => revalidate()}
        />
        {allItems.length > 0 && unseen > 0 && (
          <MenuBarExtra.Item
            title="Mark All as Seen"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            onAction={() => markUrlsSeen(allItems.map((item) => item.url))}
          />
        )}
        <MenuBarExtra.Item
          title="Configure Scope…"
          icon={Icon.Building}
          onAction={() => launchCommand({ name: SCOPE_COMMAND, type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Settings…" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/**
 * "511+ stars · 2,611 followers · 74 following"
 *
 * Stars are summed over the first 100 repositories only, so the total can be a
 * LOWER BOUND and the "+" says so. Showing a quietly incomplete number would
 * hand the reader a wrong one they believe.
 */
function socialText(social: Social): string {
  const stars = `${grouped(social.stars)}${social.starsAreExact ? "" : "+"}`;
  return `${stars} stars · ${grouped(social.followers)} followers · ${grouped(social.following)} following`;
}

/**
 * Nothing is swallowed: an empty list would make "no work waiting" and
 * "couldn't look" indistinguishable.
 */
function collectErrors(error: unknown, allowListEmpty: boolean, filtersDropped: boolean): AppErrorKind[] {
  const result: AppErrorKind[] = [];
  if (allowListEmpty) result.push({ type: "allowListEmpty" });
  if (filtersDropped) result.push({ type: "filtersDropped" });
  if (error) result.push(toAppError(error));
  return result;
}

export default withAccessToken(github)(Command);
