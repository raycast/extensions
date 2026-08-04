import { AppleTVConnection, RemoteKey, getKeyboardFocusState, sendKey, setText } from "@bharper/atv-js";
import { getPreferenceValues } from "@raycast/api";
import { withConnection } from "./connection";
import { launchApp } from "./companion-extras";
import { resolveAppName } from "./deep-links";
import { offerMatchesHint, pickOffer, searchTitle } from "./justwatch";

/**
 * The "play <title> [on <app>]" flow, shared by the AI tool and the Ask command.
 *
 * Strategy, in order of reliability:
 * 1. JustWatch-resolved deep link (real per-provider URL, no guessed IDs),
 *    works for Apple TV+, Disney+, Max, and most others.
 * 2. Netflix (whose tvOS deep links broke in Sept 2025) and unresolvable
 *    titles fall back to tvOS universal Search: launch the system Search app,
 *    wait for the on-screen keyboard (a real Companion text-input session,
 *    verifiable!), and type the title. Selecting a result deep-links natively.
 * 3. Bare app launch as the last resort.
 */

const TV_SEARCH_BUNDLE = "com.apple.TVSearch";

/** Providers whose web URLs don't deep-link on tvOS, route via universal search. */
const BROKEN_DEEP_LINK_PROVIDERS = new Set(["netflix", "netflixbasicwithads"]);

const PROVIDER_BUNDLES: Record<string, string> = {
  netflix: "com.netflix.Netflix",
  netflixbasicwithads: "com.netflix.Netflix",
  disneyplus: "com.disney.disneyplus",
  max: "com.wbd.stream",
  hbomax: "com.wbd.stream",
  appletvplus: "com.apple.TVWatchList",
  itunes: "com.apple.TVWatchList",
  hulu: "com.hulu.plus",
  amazonprimevideo: "com.amazon.aiv.AIVApp",
  amazonprime: "com.amazon.aiv.AIVApp",
  youtube: "com.google.ios.youtube",
};

/** Per-app URL fixups for tvOS routing quirks. */
function adaptUrlForTvos(url: string, technicalName: string): string {
  if (technicalName === "youtube") {
    // The scheme form routes reliably on tvOS; plain https is flaky.
    const id = url.match(/[?&]v=([\w-]+)/)?.[1];
    if (id) return `youtube://www.youtube.com/watch?v=${id}`;
  }
  if (technicalName === "appletvplus" || technicalName === "itunes") {
    return url.includes("?") ? `${url}&action=play` : `${url}?action=play`;
  }
  return url;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// tvOS coalesces rapid keypresses into long-presses (pyatv #792), keep gaps generous.
const KEY_GAP_MS = 800;

async function keyboardFocused(conn: AppleTVConnection): Promise<boolean> {
  try {
    return await getKeyboardFocusState(conn);
  } catch {
    return false;
  }
}

export type SearchAutomation = "type" | "open" | "play";

type SearchStage = "failed" | "typed" | "opened" | "played";

/**
 * Launch tvOS universal Search, type the title, then walk the focus-state
 * machine toward playback. The keyboard-focus flag is the only feedback
 * channel, and it gives us two verifiable transitions:
 *  - Down flips focus → false: we verifiably left the keyboard into results.
 *    (If it doesn't flip, that's the known tvOS single/zero-result quirk, bail
 *    and leave the typed query on screen rather than pressing blind.)
 *  - Select flips focus back → true: we hit a search *suggestion*, not a
 *    poster, the query was refined, so descend again and re-select.
 * After opening the top result, one more Select hits the detail page's
 * default-focused Play/Open button. Playback itself isn't verifiable without
 * the MRP channel, so messaging stays honest about that.
 */
async function searchAndPlay(
  conn: AppleTVConnection,
  title: string,
  automation: SearchAutomation,
): Promise<SearchStage> {
  await launchApp(conn, TV_SEARCH_BUNDLE);

  let typed = false;
  for (let attempt = 0; attempt < 16; attempt++) {
    await delay(500);
    if (await keyboardFocused(conn)) {
      await setText(conn, title);
      typed = true;
      break;
    }
  }
  if (!typed) return "failed";
  if (automation === "type") return "typed";

  // Let live results populate (no "results ready" event exists).
  await delay(2000);

  // Leave the keyboard, verified by the focus flag flipping false.
  let leftKeyboard = false;
  for (let presses = 0; presses < 2; presses++) {
    await sendKey(conn, RemoteKey.Down);
    await delay(KEY_GAP_MS);
    if (!(await keyboardFocused(conn))) {
      leftKeyboard = true;
      break;
    }
  }
  if (!leftKeyboard) return "typed"; // single/zero-result quirk, don't press blind

  // Open the focused item.
  await sendKey(conn, RemoteKey.Select);
  await delay(1500);

  // If the keyboard came back, we selected a suggestion (query refined),
  // descend into the refreshed results and open the top poster.
  if (await keyboardFocused(conn)) {
    await delay(800);
    await sendKey(conn, RemoteKey.Down);
    await delay(KEY_GAP_MS);
    if (await keyboardFocused(conn)) return "typed";
    await sendKey(conn, RemoteKey.Select);
    await delay(1500);
  }

  // We're now on the title's canonical page. Stopping here is the reliable
  // default: it lists every provider, and which "watch option" has default
  // focus is invisible to us, a blind Play can start the wrong app.
  if (automation !== "play") return "opened";

  await delay(KEY_GAP_MS);
  await sendKey(conn, RemoteKey.Select);
  return "played";
}

export interface PlayResult {
  ok: boolean;
  message: string;
}

export async function playContent(title: string, appHint?: string): Promise<PlayResult> {
  // 1. Deterministic resolution (cached, keyless).
  let resolvedTitle: Awaited<ReturnType<typeof searchTitle>> = null;
  try {
    resolvedTitle = await searchTitle(title);
  } catch {
    // offline or API hiccup, fall through to search/app-launch paths
  }

  const offer = resolvedTitle ? pickOffer(resolvedTitle, appHint) : null;
  const displayTitle = resolvedTitle?.title ?? title;

  // Never silently open a different service than the one the user named,
  // if their provider has no offer in this region, the universal-search flow
  // lets them decide on screen instead.
  const honorsHint = !appHint || (offer !== null && offerMatchesHint(offer, appHint));

  // 2. Direct deep link when the provider supports it on tvOS.
  if (offer && honorsHint && !BROKEN_DEEP_LINK_PROVIDERS.has(offer.provider.technicalName)) {
    const url = adaptUrlForTvos(offer.url, offer.provider.technicalName);
    await withConnection((conn) => launchApp(conn, url));
    return { ok: true, message: `Opening ${displayTitle} in ${offer.provider.clearName}` };
  }

  // 3. Universal Search flow (Netflix & friends, or unresolved titles).
  const { searchAutomation } = getPreferenceValues<Preferences>();
  const stage = await withConnection((conn) => searchAndPlay(conn, displayTitle, searchAutomation ?? "open"));
  if (stage !== "failed") {
    const where = offer
      ? honorsHint
        ? ` (it's on ${offer.provider.clearName})`
        : ` (in your region it's on ${offer.provider.clearName})`
      : "";
    return {
      ok: true,
      message:
        stage === "played"
          ? `Pressed Play on the top result for “${displayTitle}”${where}. Check the TV; the default watch option may not be your preferred app.`
          : stage === "opened"
            ? `Opened “${displayTitle}”${where}. Pick your streaming app on the title page.`
            : `Typed “${displayTitle}” into Apple TV Search${where}. Pick the result on screen.`,
    };
  }

  // 4. Last resort: open the most plausible app (the user's named app wins).
  const bundleFromOffer = offer && honorsHint ? PROVIDER_BUNDLES[offer.provider.technicalName] : undefined;
  const fromHint = appHint ? resolveAppName(appHint) : null;
  const bundleId = fromHint?.bundleId ?? bundleFromOffer;
  if (bundleId) {
    await withConnection((conn) => launchApp(conn, bundleId));
    const appName = offer?.provider.clearName ?? fromHint?.name ?? "the app";
    return { ok: true, message: `Opened ${appName}. Search for “${displayTitle}” there.` };
  }

  return {
    ok: false,
    message: `Couldn't find “${title}” or a matching app. Try “play ${title} on Netflix”.`,
  };
}
