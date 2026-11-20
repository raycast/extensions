import { AppleTVConnection, RemoteKey, getKeyboardFocusState, getText, sendKey, setText } from "@bharper/atv-js";
import { getPreferenceValues } from "@raycast/api";
import { withConnection } from "./connection";
import { delay, launchApp } from "./companion-extras";
import { AppleTVError, RefusedError } from "./errors";
import { appForProvider, installedApps, resolveAppName } from "./apps";
import { ResolvedTitle, StreamingOffer, searchTitle } from "./justwatch";
import { describeVideo, latestUpload, topVideo } from "./youtube";
import { NowPlaying, describe, nowPlaying, onNowPlaying } from "./now-playing";

/**
 * The "play <title> [on <app>]" flow, shared by the AI tool and the Ask command.
 *
 * Strategy, in order of reliability:
 * 1. JustWatch-resolved deep link (real per-provider URL, no guessed IDs),
 *    works for Apple TV+, Disney+, Max, and most others.
 * 2. Netflix ignores deep links on tvOS and keeps its catalog out of Apple TV
 *    Search, so it gets its own walk to Netflix's search box.
 * 3. Anything unresolved goes through tvOS universal Search.
 * 4. Bare app launch as the last resort.
 * YouTube asks skip all of that: youtube.com itself names the video.
 *
 * Both searches steer by the one signal the Apple TV gives back: whether a
 * text field has keyboard focus. All of it runs over one connection.
 */

const NETFLIX = "com.netflix.Netflix";
const SPOTIFY = "com.spotify.client";
const YOUTUBE = "com.google.ios.youtube";
const TV_SEARCH_BUNDLE = "com.apple.TVSearch";

// tvOS coalesces rapid keypresses into long-presses (pyatv #792), keep gaps generous.
const KEY_GAP_MS = 800;

const keyboardFocused = (conn: AppleTVConnection) => getKeyboardFocusState(conn).catch(() => false);

/** Press a key, let the UI settle, and report whether a text field now has focus. */
async function press(conn: AppleTVConnection, key: RemoteKey): Promise<boolean> {
  await sendKey(conn, key);
  await delay(KEY_GAP_MS);
  return keyboardFocused(conn);
}

type SearchAutomation = "type" | "open" | "play";

/** A search screen we can drive: how to reach its text field, and how to open the top result once typed. */
interface SearchBox {
  name: string;
  /** The app it lives in, for messages. */
  app: string;
  reach: (conn: AppleTVConnection) => Promise<boolean>;
  /** False leaves the typed query on screen rather than pressing blind. */
  openTop: (conn: AppleTVConnection) => Promise<boolean>;
}

/**
 * tvOS universal Search. Down must flip focus off the keyboard (it doesn't on
 * the zero-result quirk). A second Down clears the row between the keyboard
 * and the results (tvOS 27's "Search In" app chips, YouTube first), so Select
 * opens a result for the title rather than another app's search.
 */
const APPLE_TV_SEARCH: SearchBox = {
  name: "Apple TV Search",
  app: "Apple TV Search",
  async reach(conn) {
    await launchApp(conn, TV_SEARCH_BUNDLE);
    for (let attempt = 0; attempt < 8; attempt++) {
      await delay(500);
      if (await keyboardFocused(conn)) return true;
    }
    // Reopened, Search keeps its last results focused: climb back to the keyboard.
    for (let row = 0; row < 3; row++) if (await press(conn, RemoteKey.Up)) return true;
    return false;
  },
  async openTop(conn) {
    if (await press(conn, RemoteKey.Down)) return false;
    await press(conn, RemoteKey.Down);
    await sendKey(conn, RemoteKey.Select);
    return true;
  },
};

/**
 * Open an app on a focused text field if it resumes on one; otherwise leave it
 * from whatever depth it reopened at (Back from the player, a title page or a
 * tab eventually exits, and extra Backs on the tvOS home screen do nothing)
 * and reopen it at its top level. Netflix and Spotify both exit only from
 * their menu bar, so they reopen on it.
 */
async function freshStart(conn: AppleTVConnection, bundleId: string): Promise<boolean> {
  const open = async () => {
    await launchApp(conn, bundleId);
    await delay(3500);
  };
  await open();
  if (await keyboardFocused(conn)) return true;
  for (let level = 0; level < 6; level++) {
    await sendKey(conn, RemoteKey.Menu);
    await delay(600);
  }
  await open();
  return false;
}

/**
 * Netflix's own search, mapped on tvOS 27 with the 2026 Netflix app: a menu
 * bar across the top (profile, search, Home, Shows, …) and a search page whose
 * letter row is a real text field.
 *
 * After a fresh start Netflix shows a menu bar item, or on a cold start the
 * profile picker with the last-used profile highlighted. One probe is safe on
 * both: Down enters the search box from the search icon, and Up undoes it on
 * the picker. Otherwise Select takes the picker's profile (or re-selects a
 * tab), and the walk tries Down at each menu stop before stepping Left, so it
 * stops at search and never reaches the profile menu beside it.
 */
const NETFLIX_SEARCH: SearchBox = {
  name: "Netflix search",
  app: "Netflix",
  async reach(conn) {
    if (await freshStart(conn, NETFLIX)) return true;
    if (await press(conn, RemoteKey.Down)) return true;
    await press(conn, RemoteKey.Up);
    await sendKey(conn, RemoteKey.Select);
    await delay(5000);
    for (let row = 0; row < 2; row++) await press(conn, RemoteKey.Up);
    for (let tab = 0; tab < 4; tab++) {
      if (await press(conn, RemoteKey.Down)) return true;
      await press(conn, RemoteKey.Up);
      await press(conn, RemoteKey.Left);
    }
    return press(conn, RemoteKey.Down);
  },
  async openTop(conn) {
    if (await press(conn, RemoteKey.Down)) return false; // no results to leave the keyboard for
    // Down lands on the first poster or the genre list beside the results,
    // depending on the key focused. Left twice pins the genre list, Right enters the top result.
    for (const key of [RemoteKey.Left, RemoteKey.Left, RemoteKey.Right]) await press(conn, key);
    await sendKey(conn, RemoteKey.Select);
    return true;
  },
};

/**
 * Spotify's own search (its tvOS app ignores spotify: links since its 2025
 * rebuild). After a fresh start Spotify sits on its Home tab, Search is one
 * step right, and its letter row is a real text field. Filter chips (All,
 * Tracks, …) sit between the keyboard and the results. The top result opens
 * its artist, album, or playlist page (a song opens its album) with the Play
 * button focused.
 */
const SPOTIFY_SEARCH: SearchBox = {
  name: "Spotify search",
  app: "Spotify",
  async reach(conn) {
    if (await freshStart(conn, SPOTIFY)) return true;
    await press(conn, RemoteKey.Right);
    return press(conn, RemoteKey.Select);
  },
  async openTop(conn) {
    if (await press(conn, RemoteKey.Down)) return false;
    await press(conn, RemoteKey.Down);
    for (let column = 0; column < 3; column++) await press(conn, RemoteKey.Left);
    await sendKey(conn, RemoteKey.Select);
    return true;
  },
};

/** Apps whose own search the flow drives, by bundle ID. */
const IN_APP_SEARCH: Record<string, SearchBox> = { [NETFLIX]: NETFLIX_SEARCH, [SPOTIFY]: SPOTIFY_SEARCH };

/** Type the title into a search box and open the top result. */
async function search(conn: AppleTVConnection, box: SearchBox, title: string, automation: SearchAutomation) {
  // setText is silent when focus slips away mid-call, so read the box back before trusting it.
  const typed = async () => {
    if (!(await box.reach(conn))) return false;
    await setText(conn, title);
    return (await getText(conn)) === title;
  };
  if (!(await typed()) && !(await typed())) return "failed";
  if (automation === "type") return "typed";

  await delay(2000); // let results populate; no "results ready" event exists
  return (await box.openTop(conn)) ? "opened" : "typed";
}

/** Whether an offer plays in the app the user named: by our catalog when it knows both, else by name. */
function offerMatchesHint(offer: StreamingOffer, hint: string, installed: Record<string, string> = {}): boolean {
  const named = resolveAppName(hint, installed);
  const offered = appForProvider(offer.provider.technicalName, installed);
  if (named && offered) return named.bundleId === offered.bundleId;
  const h = hint.trim().toLowerCase();
  const provider = offer.provider.clearName.toLowerCase();
  const bare = h.replace(/[^a-z0-9]/g, ""); // "paramount+" → "paramount", inside "paramountplus"
  return (
    h.length > 0 &&
    (provider.includes(h) || h.includes(provider) || (!!bare && offer.provider.technicalName.includes(bare)))
  );
}

/** Offers that play without a purchase: subscription, free, or with ads. */
const watchable = (offer: StreamingOffer) => ["FLATRATE", "FREE", "ADS"].includes(offer.monetizationType);

/**
 * An offer in the app the user named, else a watchable offer in an app
 * installed on the Apple TV (nothing says which services are paid for, so
 * installed stands in), else any watchable offer, else anything.
 */
function pickOffer({ offers }: ResolvedTitle, installed: Record<string, string>, hint?: string): StreamingOffer | null {
  const onTv = (o: StreamingOffer) =>
    (appForProvider(o.provider.technicalName, installed)?.bundleId ?? "") in installed;
  return (
    (hint ? offers.find((o) => offerMatchesHint(o, hint, installed)) : undefined) ??
    offers.find((o) => watchable(o) && onTv(o)) ??
    offers.find(watchable) ??
    offers[0] ??
    null
  );
}

/** Open a deep link. tvOS asks "Open in <app>?" before following a custom scheme like youtube://, with Open focused. */
async function openLink(conn: AppleTVConnection, url: string): Promise<void> {
  await launchApp(conn, url);
  if (/^https?:/.test(url)) return;
  await delay(2000);
  await sendKey(conn, RemoteKey.Select);
}

/**
 * The channel in "the latest Will Tennyson video", "Will Tennyson's newest
 * upload", "most recent video from MKBHD". Needs both a recency word and
 * "video" or "upload", so "new girl" stays a show.
 */
function latestVideoChannel(title: string): string | undefined {
  if (!/\b(?:video|upload)\b/i.test(title) || !/\b(?:latest|newest|most recent|new|last)\b/i.test(title)) return;
  const rest = title.replace(/\b(?:the|latest|newest|most recent|new|last|youtube|video|upload)\b|'s\b/gi, " ");
  return (
    rest
      .replace(/^\s*(?:from|by|of)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim() || undefined
  );
}

/**
 * What was playing when the request came in, and whether that has stopped or
 * changed since. Started before any navigation, so a stop seen while the app
 * is being driven still counts at the last check.
 */
interface PlaybackWatch {
  before: NowPlaying | null;
  changed: boolean;
}

async function watchPlayback(conn: AppleTVConnection): Promise<PlaybackWatch> {
  const watch: PlaybackWatch = { before: await nowPlaying(conn, () => true, 1000), changed: false };
  const { before } = watch;
  onNowPlaying(conn, (s) => {
    if (!s.playing || s.bundleId !== before?.bundleId || s.title !== before?.title) watch.changed = true;
  });
  return watch;
}

/**
 * Waits for playback to start in `expected` and describes it. Reports from
 * other apps don't count, and neither does whatever was already playing
 * before the request, unless it has stopped or changed since. Netflix and
 * Spotify omit their bundle ID, so unnamed reports count only when
 * `anonymous` says the expected app sends them.
 */
async function confirmPlaying(
  conn: AppleTVConnection,
  watch: PlaybackWatch,
  appNames: Record<string, string>,
  show: string,
  timeoutMs: number,
  expected?: string,
  anonymous = false,
): Promise<string | null> {
  const { before } = watch;
  const stale = (s: NowPlaying) => before?.playing && s.bundleId === before.bundleId && s.title === before.title;
  const state = await nowPlaying(
    conn,
    (s) =>
      s.playing &&
      !(expected && s.bundleId && s.bundleId !== expected) &&
      (s.bundleId !== undefined || anonymous) &&
      (watch.changed || !stale(s)),
    timeoutMs,
  );
  return state && `Playing ${describe(state, appNames, show)}`;
}

/** Play a title, returning what happened in words the user can act on. Throws when nothing could be opened. */
export async function playContent(title: string, appHint?: string): Promise<string> {
  const named = appHint ? resolveAppName(appHint) : null;
  const channel = latestVideoChannel(title);
  if (channel || named?.bundleId === YOUTUBE) {
    const id = await (channel ? latestUpload(channel) : topVideo(title)).catch(() => undefined);
    if (id) {
      const video = await describeVideo(id).catch(() => "the video");
      return withConnection(async (conn) => {
        const watch = await watchPlayback(conn);
        await openLink(conn, `youtube://www.youtube.com/watch?v=${id}`);
        const playing = await confirmPlaying(conn, watch, {}, video, 12000, YOUTUBE);
        return playing ? `Playing ${video} on YouTube` : `Opened ${video} on YouTube, but it didn't start playing.`;
      });
    }
    if (channel) throw new AppleTVError(`Couldn't find a YouTube channel called “${channel}”.`, "Couldn't Play That");
  }

  // Offline or an API hiccup falls through to the search and app-launch paths. Music isn't in JustWatch.
  const resolved = named?.bundleId === SPOTIFY ? null : await searchTitle(title).catch(() => null);
  const shown = resolved?.title ?? title;
  const automation = getPreferenceValues<Preferences>().searchAutomation ?? "play";

  return withConnection(async (conn) => {
    const installed = await installedApps(conn);
    // Re-match the named app now the installed list is known, so regional variants pick the one on this TV.
    const namedApp = appHint ? resolveAppName(appHint, installed) : null;
    const watch = await watchPlayback(conn);
    const offer = resolved && pickOffer(resolved, installed, appHint);
    const app = offer ? appForProvider(offer.provider.technicalName, installed) : undefined;

    // Never silently open a different service than the one the user named. If
    // their provider has no offer here, universal search lets them pick on screen.
    const honorsHint = !appHint || (!!offer && offerMatchesHint(offer, appHint, installed));
    const where = offer ? ` (${honorsHint ? "it's" : "in your region it's"} on ${offer.provider.clearName})` : "";
    const target = namedApp?.bundleId ?? (honorsHint ? app?.bundleId : undefined);
    // Use an app's own search when it carries the title, or when JustWatch can't say and the user named it.
    const inApp = target && (honorsHint || !offer) ? IN_APP_SEARCH[target] : undefined;

    if (offer && honorsHint && !inApp) {
      // The provider's tvOS link usually starts playback and resumes; its web link opens the title page.
      // A purchase never starts on its own: buy and rent offers only open the title page.
      const play = automation === "play" && watchable(offer);
      const adapt = (url?: string) => url && (app?.adaptUrl?.(url) ?? url);
      const watchLink = play ? adapt(offer.tvUrl) : undefined;
      for (const link of [watchLink, adapt(offer.url)]) {
        if (!link) continue;
        try {
          await openLink(conn, link);
        } catch (error) {
          // A refused link falls through to the next one, then to search; anything else is a real failure.
          if (error instanceof RefusedError) continue;
          throw error;
        }
        const opened = `Opened ${shown} in ${offer.provider.clearName}`;
        if (!play) return watchable(offer) ? opened : `${opened}. It's available to buy or rent there.`;
        const confirm = () => confirmPlaying(conn, watch, installed, shown, 10000, app?.bundleId);
        const started = await confirm();
        if (started) return started;
        // Nothing started. A cold start may have put the app's profile picker
        // first, where Select takes the highlighted (last-used) profile; after a
        // web link the show page then needs Select on its focused Play button.
        // Only in apps where that's checked: a signed-out app focuses its
        // sign-up button.
        const presses = app?.resumes ? (link === watchLink ? 1 : 2) : 0;
        for (let press = 0; press < presses; press++) {
          await sendKey(conn, RemoteKey.Select);
          const playing = await confirm();
          if (playing) return playing;
        }
        return `${opened}, but it didn't start playing. It may need a profile or a sign-in.`;
      }
    }

    const box = inApp ?? APPLE_TV_SEARCH;
    const stage = await search(conn, box, shown, automation);
    if (stage === "opened" && automation === "play") {
      const confirm = (ms: number) => confirmPlaying(conn, watch, installed, shown, ms, inApp && target, !!inApp);
      // Some results start as they open (a Spotify song starts its album); otherwise
      // the title page's focused Play button. Select there toggles, so check first.
      let playing = await confirm(3000);
      if (!playing) {
        await sendKey(conn, RemoteKey.Select);
        playing = await confirm(12000);
      }
      return (
        playing ??
        `Pressed Play on “${shown}”${inApp ? ` in ${box.app}` : where}, but it didn't start playing. Check the TV.`
      );
    }
    if (stage === "opened") {
      return inApp
        ? `Opened “${shown}” in ${box.app}`
        : `Opened “${shown}”${where}. Pick your streaming app on the title page.`;
    }
    if (stage === "typed") return `Typed “${shown}” into ${box.name}${inApp ? "" : where}. Pick the result on screen.`;

    // Last resort: open the most plausible app, the user's named app first.
    if (!target) {
      throw new AppleTVError(
        `Couldn't find “${title}” or a matching app. Try “play ${title} on Netflix”.`,
        "Couldn't Play That",
      );
    }
    await launchApp(conn, target);
    return `Opened ${namedApp?.name ?? offer?.provider.clearName ?? "the app"}. Search for “${shown}” there.`;
  });
}
