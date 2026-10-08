// src/index.tsx
import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { syncSteamData } from "./data/sync";
import {
  getRecommendations,
  SessionIntent,
  formatTotalPlaytime,
  MOOD_DEFINITIONS,
  TAG_GROUPS,
  BROAD_TAGS,
  removeRedundantTags,
  ScoredGame,
} from "./engine";
import { GameCache } from "./types";
import { useCachedState } from "@raycast/utils";

function getSteamStoreUrl(appId: number, useClient: boolean) {
  if (useClient) {
    return `steam://store/${appId}`;
  }
  return `https://store.steampowered.com/app/${appId}`;
}

function truncateName(name: string, limit: number = 25): string {
  if (!name) return "";
  return name.length > limit ? name.substring(0, limit) + "..." : name;
}

const INTENT_TITLES: Record<string, string> = {
  Smart_Mix: "Algorithm's Top Pick · Smart mix for you",
  Discover_New: "Algorithm's Top Pick · From unplayed backlog",
  Rediscover: "Algorithm's Top Pick · Previously played favorites",
  Break_Mold: "Algorithm's Top Pick · Outside your usual preferences",

  Mood_Story: "Algorithm's Top Pick · Narrative-heavy experiences",
  Mood_Chill: "Algorithm's Top Pick · Relaxing, low-pressure gameplay",
  Mood_Adrenaline: "Algorithm's Top Pick · Fast combat and high intensity",
  Mood_DeepDive: "Algorithm's Top Pick · System-heavy, complex gameplay",
  Mood_Infinite: "Algorithm's Top Pick · High replayability and endless runs",
  Mood_DeckAndDice: "Algorithm's Top Pick · Cards, dice, and tabletops",

  Mood_Short: "Algorithm's Top Pick · Short, arcade-style experiences",
  Mood_Puzzle: "Algorithm's Top Pick · Logic-based problem solving",
  Mood_Sports: "Algorithm's Top Pick · Sports and racing focused gameplay",
  Mood_Horror: "Algorithm's Top Pick · Dark, tense atmospheres",
  Mood_Fantasy: "Algorithm's Top Pick · Epic fantasy and magic",
  Mood_Retro: "Algorithm's Top Pick · Classic and retro-style games",

  Social_Solo: "Algorithm's Top Pick · Single-player focused",
  Social_Coop: "Algorithm's Top Pick · Cooperative multiplayer",
  Social_Competitive: "Algorithm's Top Pick · Competitive PvP gameplay",
};

const TPL_TASTE = [
  "Matches your {tags} history.",
  "Because you like {tags}.",
  "Consistent with your {tags} play.",
  "Based on your {tags} history.",
  "Aligns with your {tags} patterns.",
];

const TPL_RETURN = [
  "{tags}. Unplayed for {days} days.",
  "{tags}. Waiting for {days} days.",
  "{tags}. Shelved for {days} days.",
  "{tags}. Dormant for {days} days.",
  "{tags}. Untouched for {days} days.",
];

const TPL_MOLD = [
  "Outside your comfort zone: {tags}.",
  "Unmapped territory: {tags}.",
  "Fresh palate cleanser: {tags}.",
  "Breaks your usual loop: {tags}.",
  "New territory: {tags}.",
];

const TPL_WILDCARD = [
  "Algorithm curveball: {tags}.",
  "Wildcard pick: {tags}.",
  "System outlier: {tags}.",
  "Off-script pick: {tags}.",
  "Surprise match: {tags}.",
];

const TPL_MOOD_WILDCARD = [
  "{tags} pick, outside your profile.",
  "Pure {tags}, off your history.",
  "{tags}, without usual bias.",
  "{tags} find, independent of habits.",
  "{tags} through a fresh lens.",
];

const TPL_WILDCARD_PLAYED_LONG = [
  "Off-pattern past play: {tags}.",
  "{tags} outlier from your library.",
  "Unexpected {tags} return.",
  "Divergent history: {tags}.",
  "Past {tags} departure you enjoyed.",
];

const TPL_WILDCARD_PLAYED_SHORT = [
  "Briefly played this {tags} game.",
  "Past {tags} detour you once took.",
  "Explored this {tags} game briefly before.",
  "Past session with this {tags} game.",
  "You previously tried this {tags} title.",
];

const TPL_MOLD_PLAYED_SHORT = [
  "Brief trial ({playtime}m). Break your mold with {tags}.",
  "{playtime}m on record. Step into {tags}.",
  "Barely touched ({playtime}m). Explore {tags}.",
  "Peeked for {playtime}m. Dive into {tags}.",
  "Quick {playtime}m trial. Fresh {tags} awaits.",
];

const TPL_BACKLOG_PLAYED_SHORT = [
  "Barely touched ({playtime}m). Dive into {tags}.",
  "{playtime}m played. Your {tags} backlog calls.",
  "Quick {playtime}m session. Ready for {tags}?",
  "Tested for {playtime}m. Finish this {tags} title.",
  "Briefly played ({playtime}m). Missed {tags}?",
];

const TPL_BACKLOG_UNTOUCHED = [
  "Untouched {tags} in your backlog.",
  "Unplayed {tags} gem.",
  "Zero minutes on record. Dive into {tags}.",
  "Gathering dust. Time for {tags}.",
  "Brand new to you. Explore {tags}.",
];

const UI_IGNORE = new Set([
  "multi-player",
  "single-player",
  "valve anti-cheat enabled",
  "co-op",
  "captions available",
  "commentary available",
  "stats",
  "includes source sdk",
  "includes level editor",
  "partial controller support",
  "mmo",
  "steam achievements",
  "steam cloud",
  "shared/split screen",
  "cross-platform multiplayer",
  "shared/split screen co-op",
  "full controller support",
  "steam trading cards",
  "steam workshop",
  "vr support",
  "tracked controller support",
  "vr only",
  "in-app purchases",
  "shared/split screen pvp",
  "steamvr collectibles",
  "remote play on phone",
  "remote play on tablet",
  "remote play on tv",
  "remote play together",
  "lan pvp",
  "lan co-op",
  "pvp",
  "steam turn notifications",
  "2d",
  "3d",
  "2.5d",
  "atmospheric",
  "great soundtrack",
  "pixel graphics",
  "hand-drawn",
  "female protagonist",
  "native steam controller",
  "online pvp",
  "cloud gaming",
  "cloud gaming (nvidia)",
  "additional high-quality audio",
  "character customization",
  "free to play",
  "massively multiplayer",
  "indie",
  "early access",
  "casual",
  "multiplayer",
  "singleplayer",
  "mmorpg",
  "asynchronous multiplayer",
  "esports",
  "competitive",
  "local co-op",
  "online co-op",
  "local multiplayer",
  "4 player local",
  "pve",
  "split screen",
  "demo available",
  "vr",
  "asymmetric vr",
  "mods (require hl2)",
  "mods (require hl1)",
  "demos",
  "hdr available",
  "downloadable content",
  "steam leaderboards",
  "vr supported",
  "family friendly",
  "first-person",
  "first person",
  "third person",
  "third-person",
  "hardware",
  "trackir",
  "voice control",
  "touch-friendly",
  "mouse only",
  "controller",
  "utilities",
  "design & illustration",
  "video production",
  "photo editing",
  "animation & modeling",
  "audio production",
  "education",
  "software training",
  "software",
  "360 video",
  "desktop companion",
  "ai content disclosed",
  "profile features limited",
  "game development",
  "programming",
  "language learning",
  "benchmark",
  "level editor",
  "mod",
  "moddable",
]);

function displayTag(tag: string): string {
  const lower = tag.toLowerCase();

  if (TAG_GROUPS && TAG_GROUPS[lower]) {
    return TAG_GROUPS[lower].display;
  }

  return tag
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function pickFirst(arr: string[] | undefined | null, n: number): string | null {
  if (!arr || arr.length === 0) return null;

  const cleaned = [...new Set(arr)].filter(
    (t) => t.length >= 2 && !/^\d+$/.test(t),
  );

  const strictCleaned = cleaned.filter((t) => !UI_IGNORE.has(t.toLowerCase()));

  const finalArr = strictCleaned.length > 0 ? strictCleaned : cleaned;

  if (finalArr.length === 0) return null;

  finalArr.sort((a, b) => {
    const aBroad = BROAD_TAGS.has(a.toLowerCase()) ? 1 : 0;
    const bBroad = BROAD_TAGS.has(b.toLowerCase()) ? 1 : 0;
    return aBroad - bBroad;
  });

  const selected = finalArr.slice(0, n).map(displayTag);

  if (selected.length === 2) return `${selected[0]} and ${selected[1]}`;
  return selected.join(", ");
}

function getDynamicSubtitle(
  reasonId: string,
  payload: { type: string; value: string | number },
  appId: number,
  percentile: number,
  matchPercent: number,
  intent: string,
  traits: string[],
  topMatchedTraits?: string[],
  userAnchorLabel?: string,
  refreshSeed?: number,
  originalTags?: string[],
  playtime: number = 0,
): string {
  let h = appId ^ (refreshSeed || 0);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  const seed = (h ^ (h >>> 16)) >>> 0;

  // 1. RETURN (Forgotten / Rediscover)
  if (reasonId === "FORGOTTEN_FAVORITE") {
    const days = payload.value;
    const isMoodOrSocial =
      intent.startsWith("Mood_") || intent.startsWith("Social_");
    let tags: string;

    if (isMoodOrSocial) {
      const def = MOOD_DEFINITIONS[intent];
      const positiveSet = def
        ? new Set(def.positive.map((t) => t.toLowerCase()))
        : new Set<string>();
      const rawSource =
        originalTags && originalTags.length > 0
          ? [...new Set(originalTags.map((t) => t.toLowerCase()))]
          : traits.map((t) => t.toLowerCase());
      const source = removeRedundantTags(rawSource);
      const matched = source.filter((t) => positiveSet.has(t));
      tags =
        matched.length > 0
          ? matched
              .slice(0, 2)
              .map((t) => displayTag(t))
              .join(", ")
          : pickFirst(traits, 2) || "Past favorites";
    } else {
      tags = pickFirst(traits, 2) || "Past favorites";
    }

    const tpl = TPL_RETURN[seed % TPL_RETURN.length];
    return tpl.replace("{tags}", tags).replace("{days}", String(days));
  }

  // 2. BREAK THE MOLD & WILDCARD
  if (intent === "Break_Mold" || reasonId === "NEW_EXPERIENCE") {
    const tags =
      payload && payload.type === "TAG" && payload.value
        ? String(payload.value)
        : "New Mechanics";
    if (playtime > 0) {
      const tpl = TPL_MOLD_PLAYED_SHORT[seed % TPL_MOLD_PLAYED_SHORT.length];
      return tpl
        .replace("{tags}", tags)
        .replace("{playtime}", String(playtime));
    }

    const tpl = TPL_MOLD[seed % TPL_MOLD.length];
    return tpl.replace("{tags}", tags);
  }

  // DISCOVER NEW (THE BACKLOG)
  if (intent === "Discover_New") {
    const tags = pickFirst(traits, 2) || "Uncharted Elements";

    if (playtime > 0) {
      const tpl =
        TPL_BACKLOG_PLAYED_SHORT[seed % TPL_BACKLOG_PLAYED_SHORT.length];
      return tpl
        .replace("{playtime}", String(playtime))
        .replace("{tags}", tags);
    }

    const tpl = TPL_BACKLOG_UNTOUCHED[seed % TPL_BACKLOG_UNTOUCHED.length];
    return tpl.replace("{tags}", tags);
  }

  if (reasonId === "WILDCARD") {
    const isMoodOrSocial =
      intent.startsWith("Mood_") || intent.startsWith("Social_");
    let tags: string;

    if (isMoodOrSocial) {
      const def = MOOD_DEFINITIONS[intent];
      const positiveSet = def
        ? new Set(def.positive.map((t) => t.toLowerCase()))
        : new Set<string>();
      const rawSource =
        originalTags && originalTags.length > 0
          ? [...new Set(originalTags.map((t) => t.toLowerCase()))]
          : traits.map((t) => t.toLowerCase());
      const source = removeRedundantTags(rawSource);
      const matched = source.filter((t) => positiveSet.has(t));
      tags =
        matched.length > 0
          ? matched
              .slice(0, 2)
              .map((t) => displayTag(t))
              .join(", ")
          : pickFirst(traits, 2) || "Uncharted Elements";
    } else {
      tags = pickFirst(traits, 2) || "Uncharted Elements";
    }

    let tpl: string;
    if (playtime >= 120) {
      tpl = TPL_WILDCARD_PLAYED_LONG[seed % TPL_WILDCARD_PLAYED_LONG.length];
    } else if (playtime > 0) {
      tpl = TPL_WILDCARD_PLAYED_SHORT[seed % TPL_WILDCARD_PLAYED_SHORT.length];
    } else {
      tpl = isMoodOrSocial
        ? TPL_MOOD_WILDCARD[seed % TPL_MOOD_WILDCARD.length]
        : TPL_WILDCARD[seed % TPL_WILDCARD.length];
    }

    return tpl.replace("{tags}", tags);
  }

  // 3. MOOD INTENTS
  const moodDef = MOOD_DEFINITIONS[intent];

  if (moodDef) {
    const positiveSet = new Set(moodDef.positive.map((t) => t.toLowerCase()));
    const rawSource =
      originalTags && originalTags.length > 0
        ? [...new Set(originalTags.map((t) => t.toLowerCase()))]
        : traits.map((t) => t.toLowerCase());
    const source = removeRedundantTags(rawSource);

    const matchedMoodTags = source.filter((t) => positiveSet.has(t));

    matchedMoodTags.sort((a, b) => {
      const aBroad = BROAD_TAGS.has(a) ? 1 : 0;
      const bBroad = BROAD_TAGS.has(b) ? 1 : 0;
      return aBroad - bBroad;
    });

    let gameTags = "";
    if (matchedMoodTags.length > 0) {
      const selected = matchedMoodTags.slice(0, 2).map(displayTag);
      gameTags =
        selected.length === 2
          ? `${selected[0]} and ${selected[1]}`
          : selected[0];
    }

    if (!gameTags) gameTags = pickFirst(traits, 2) || "Classic";

    const hasValidTrait =
      matchPercent >= 20 && topMatchedTraits && topMatchedTraits.length > 0;
    const userTraitRaw = hasValidTrait ? displayTag(topMatchedTraits[0]) : "";

    if (
      !userTraitRaw ||
      gameTags.toLowerCase().includes(userTraitRaw.toLowerCase())
    ) {
      const tpls = [
        "A pure {tags} experience.",
        "Focuses heavily on {tags}.",
        "Delivers a strong {tags} vibe.",
      ];
      return tpls[seed % tpls.length].replace("{tags}", gameTags);
    } else {
      const tpls = [
        "{tags} via your {userTrait} history.",
        "{tags}, driven by your {userTrait} history.",
        "{tags} game, fitting your {userTrait} patterns.",
        "{tags} meets {userTrait}.",
      ];
      return tpls[seed % tpls.length]
        .replace("{tags}", gameTags || "")
        .replace("{userTrait}", userTraitRaw);
    }
  }

  // 4. SMART MIX / DISCOVER NEW / SOCIAL etc. (taste-based)
  if (matchPercent >= 20 && topMatchedTraits && topMatchedTraits.length > 0) {
    const userTraitRaw = displayTag(topMatchedTraits[0]);

    const gameSpecificTags = traits.filter(
      (t) => t.toLowerCase() !== topMatchedTraits[0].toLowerCase(),
    );

    if (gameSpecificTags.length > 0) {
      const gameTags = pickFirst(gameSpecificTags, 2);
      const tpls = [
        "{tags}, matching your {userTrait} preference.",
        "{tags}, driven by your {userTrait} history.",
        "{tags}, hitting your {userTrait} patterns.",
      ];
      return tpls[seed % tpls.length]
        .replace("{tags}", gameTags || "")
        .replace("{userTrait}", userTraitRaw);
    } else {
      const tpl = TPL_TASTE[seed % TPL_TASTE.length];
      return tpl.replace("{tags}", pickFirst(topMatchedTraits, 2) || "");
    }
  }

  const gameTags = pickFirst(traits, 2);
  if (!gameTags) return "A classic experience from your library.";
  return `Explores ${gameTags}.`;
}

function getMatchVisuals(
  item: ScoredGame,
  intent: string,
): { icon: Icon; tooltip: string } {
  if (item.reasonId === "WILDCARD") {
    if (item.game.playtime >= 120) {
      return { icon: Icon.Eye, tooltip: "Outlier History" };
    } else if (item.game.playtime > 0) {
      return { icon: Icon.Footprints, tooltip: "Briefly Tested" };
    }
    return { icon: Icon.Stars, tooltip: "Algorithm Wildcard" };
  }
  if (item.reasonId === "FORGOTTEN_FAVORITE") {
    return { icon: Icon.RotateAntiClockwise, tooltip: "Forgotten Favorite" };
  }

  if (intent === "Break_Mold" || item.reasonId === "NEW_EXPERIENCE") {
    return { icon: Icon.Compass, tooltip: "Novelty Pick" };
  }

  if (item.matchPercent >= 60) {
    return { icon: Icon.Star, tooltip: "High Match" };
  }
  if (item.matchPercent >= 25) {
    return { icon: Icon.StarCircle, tooltip: "Solid Alternative" };
  }

  return { icon: Icon.Circle, tooltip: "Discovery Pick" };
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [allGames, setAllGames] = useState<GameCache[]>([]);
  const [intent, setIntent] = useState<SessionIntent>("Smart_Mix");
  const [refreshKey, setRefreshKey] = useState(() => Date.now());

  const [skippedGames, setSkippedGames] = useCachedState<
    Record<number, { ts: number; name: string; tags: string[] }>
  >("skippedGames", {});

  const prefs = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchGames() {
      try {
        const data = await syncSteamData((progressData) => {
          setAllGames(progressData);
        });
        setAllGames(data);
      } catch (error) {
        console.error(error);
        showToast({
          title: "Sync Error",
          message: String(error),
          style: Toast.Style.Failure,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchGames();
  }, []);

  const handleSkip = (appId: number, name: string, tags: string[]) => {
    const newState = {
      ...skippedGames,
      [appId]: { ts: Date.now(), name, tags },
    };
    setSkippedGames(newState);
    showToast({ title: "Skipped", message: name });
  };

  const games = useMemo(() => {
    const limit = parseInt(prefs.listLimit || "10", 10);
    const timeframe = prefs.tasteTimeframe || "90";
    return getRecommendations(
      allGames,
      limit,
      intent,
      timeframe,
      skippedGames,
      prefs,
      refreshKey,
    );
  }, [
    allGames,
    intent,
    skippedGames,
    refreshKey,
    prefs.listLimit,
    prefs.tasteTimeframe,
    prefs.modeFilter,
    prefs.maxAgeYears,
    prefs.blacklistedTags,
    prefs.requireController,
    prefs.requireAchievements,
    prefs.hideFreeToPlay,
    prefs.vrFilter,
    prefs.showOnlyInstalled,
  ]);

  const processedGames = useMemo(() => {
    if (games.length === 0) return { topPick: null, rest: [] };

    const specialReasons = new Set([
      "FORGOTTEN_FAVORITE",
      "WILDCARD",
      "NEW_EXPERIENCE",
    ]);

    const regular = games.filter((g) => !specialReasons.has(g.reasonId));
    const special = games.filter((g) => specialReasons.has(g.reasonId));

    const core = regular.filter((g) => g.matchPercent >= 35);

    const secondary = regular.filter(
      (g) => g.matchPercent >= 20 && g.matchPercent < 35,
    );

    const gray = regular.filter((g) => g.matchPercent < 20);

    const pickBest = (arr: typeof regular) => {
      if (arr.length === 0) return null;

      return arr.reduce((best, cur) =>
        cur.normalizedScore > best.normalizedScore ? cur : best,
      );
    };

    const topPick =
      pickBest(core) ||
      pickBest(secondary) ||
      pickBest(gray) ||
      pickBest(special) ||
      null;

    const restRegular = regular.filter(
      (g) => g.game.appId !== topPick?.game.appId,
    );

    return {
      topPick,
      rest: [
        ...restRegular,
        ...special.filter((g) => g.game.appId !== topPick?.game.appId),
      ],
    };
  }, [games]);

  const libraryStats = useMemo(() => {
    let playedCount = 0;
    let unplayedCount = 0;
    for (const g of allGames) {
      if (g.playtime > 0) playedCount++;
      else unplayedCount++;
    }
    return { playedCount, unplayedCount };
  }, [allGames]);

  let emptyTitle = "No Matches Found";
  let emptyDesc =
    "No games fit the selected strategy or filters. Try adjusting your preferences.";
  let emptyIcon = Icon.Tray;

  if (isLoading) {
    emptyTitle = "Analyzing play history...";
    emptyDesc = "Please wait.";
    emptyIcon = Icon.Tray;
  } else if (allGames.length === 0) {
    emptyTitle = "Steam Library Not Found";
    emptyDesc =
      "We couldn't locate your games. If Steam is on a custom drive or folder, open preferences and select your MAIN installation folder.";
    emptyIcon = Icon.Warning;
  } else if (intent === "Rediscover") {
    emptyTitle = "No Forgotten Favorites Found";
    emptyDesc =
      "No games match the criteria (3+ hours played, untouched for 60+ days) under your current active filters.";
    emptyIcon = Icon.RotateAntiClockwise;
  } else if (intent === "Break_Mold" && libraryStats.playedCount < 3) {
    emptyTitle = "Insufficient Play History";
    emptyDesc =
      "This mode requires at least 3 played games to establish your habits before it can break them.";
    emptyIcon = Icon.MagnifyingGlass;
  } else if (intent === "Break_Mold") {
    emptyTitle = "Not Enough Unplayed Games";
    emptyDesc =
      "Could not find unplayed games outside your comfort zone matching your current active filters.";
    emptyIcon = Icon.MagnifyingGlass;
  } else if (intent === "Discover_New") {
    emptyTitle = "Backlog Empty";
    emptyDesc = "No unplayed games found matching your current active filters.";
    emptyIcon = Icon.Stars;
  } else if (intent.startsWith("Mood_") || intent.startsWith("Social_")) {
    emptyTitle = "No Matching Games";
    emptyDesc =
      "No games match this category under your current active filters.";
    emptyIcon = Icon.Filter;
  }

  const topPick = processedGames.topPick;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recommendations..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Recommendation Strategy"
          value={intent}
          onChange={(newValue) => setIntent(newValue as SessionIntent)}
        >
          <List.Dropdown.Item
            key="Smart_Mix"
            title="🎯 Smart Mix"
            value="Smart_Mix"
          />

          <List.Dropdown.Section title="For You (Library)">
            <List.Dropdown.Item
              key="Discover_New"
              title="🕹️ The Backlog"
              value="Discover_New"
            />
            <List.Dropdown.Item
              key="Rediscover"
              title="💭 Rediscover"
              value="Rediscover"
            />
            <List.Dropdown.Item
              key="Break_Mold"
              title="🌀 Break the Mold"
              value="Break_Mold"
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Vibes & Moods">
            <List.Dropdown.Item
              key="Mood_Story"
              title="📖 Story Focus"
              value="Mood_Story"
            />
            <List.Dropdown.Item
              key="Mood_Chill"
              title="🌿 Chill & Relax"
              value="Mood_Chill"
            />
            <List.Dropdown.Item
              key="Mood_Adrenaline"
              title="🔥 Adrenaline & Action"
              value="Mood_Adrenaline"
            />
            <List.Dropdown.Item
              key="Mood_DeepDive"
              title="🧙 Deep Dive"
              value="Mood_DeepDive"
            />
            <List.Dropdown.Item
              key="Mood_Infinite"
              title="♾️ Infinite Loop (Replayable)"
              value="Mood_Infinite"
            />
            <List.Dropdown.Item
              key="Mood_DeckAndDice"
              title="🃏 Deck & Dice"
              value="Mood_DeckAndDice"
            />
            <List.Dropdown.Item
              key="Mood_Short"
              title="⏱️ Short & Sweet"
              value="Mood_Short"
            />
            <List.Dropdown.Item
              key="Mood_Puzzle"
              title="🧩 Brain Teasers"
              value="Mood_Puzzle"
            />
            <List.Dropdown.Item
              key="Mood_Sports"
              title="⚽ Sports & Racing"
              value="Mood_Sports"
            />
            <List.Dropdown.Item
              key="Mood_Horror"
              title="👻 Horror & Tension"
              value="Mood_Horror"
            />
            <List.Dropdown.Item
              key="Mood_Fantasy"
              title="🐉 Fantasy"
              value="Mood_Fantasy"
            />
            <List.Dropdown.Item
              key="Mood_Retro"
              title="👾 Retro Vibes"
              value="Mood_Retro"
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Who With? (Social)">
            <List.Dropdown.Item
              key="Social_Solo"
              title="🐺 Lone Wolf (Solo)"
              value="Social_Solo"
            />
            <List.Dropdown.Item
              key="Social_Coop"
              title="🤝 Co-op Night"
              value="Social_Coop"
            />
            <List.Dropdown.Item
              key="Social_Competitive"
              title="⚔️ Competitive (PvP)"
              value="Social_Competitive"
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDesc}
        actions={
          allGames.length === 0 && !isLoading ? (
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          ) : undefined
        }
      />

      {topPick &&
        (() => {
          const visuals = getMatchVisuals(topPick, intent);

          return (
            <List.Section
              title={`🎯 ${INTENT_TITLES[intent] || "Algorithm's Top Pick"}`}
            >
              <List.Item
                key={topPick.game.appId}
                icon={{
                  source: `https://steamcdn-a.akamaihd.net/steam/apps/${topPick.game.appId}/library_600x900.jpg`,
                  fallback: `https://steamcdn-a.akamaihd.net/steam/apps/${topPick.game.appId}/header.jpg`,
                }}
                title={truncateName(topPick.game.name)}
                subtitle={getDynamicSubtitle(
                  topPick.reasonId,
                  topPick.reasonPayload,
                  topPick.game.appId,
                  topPick.percentile,
                  topPick.matchPercent,
                  intent,
                  topPick.displayTraits,
                  topPick.topMatchedTraits,
                  topPick.anchorTag,
                  refreshKey,
                  [
                    ...(topPick.game.tags || []),
                    ...(topPick.game.genres || []),
                    ...(topPick.game.categories || []),
                  ],
                  topPick.game.playtime,
                )}
                accessories={[
                  ...(topPick.game.isInstalled === false
                    ? [
                        {
                          icon: Icon.Download,
                          tooltip: "Not Installed (In Library)",
                        },
                      ]
                    : []),
                  ...(topPick.game.playtime > 0
                    ? [
                        {
                          text: formatTotalPlaytime(topPick.game.playtime),
                          icon: Icon.Clock,
                        },
                      ]
                    : [{ text: "Unplayed" }]),
                  {
                    icon: { source: visuals.icon },
                    tooltip: visuals.tooltip,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Open
                      title={
                        topPick.game.isInstalled === false
                          ? "Install Game"
                          : "Launch Game"
                      }
                      target={`steam://rungameid/${topPick.game.appId}`}
                      icon={
                        topPick.game.isInstalled === false
                          ? Icon.Download
                          : Icon.Play
                      }
                    />
                    <Action.Open
                      title="Open Steam Page"
                      target={getSteamStoreUrl(
                        topPick.game.appId,
                        prefs.useSteamClient,
                      )}
                      icon={Icon.Window}
                    />
                    <Action
                      title="Skip Game"
                      icon={Icon.XMarkCircle}
                      shortcut={{
                        Windows: { modifiers: ["ctrl"], key: "s" },
                        macOS: { modifiers: ["cmd"], key: "s" },
                      }}
                      onAction={() =>
                        handleSkip(
                          topPick.game.appId,
                          topPick.game.name,
                          topPick.displayTraits,
                        )
                      }
                    />
                    <Action
                      title="Refresh Shuffle List"
                      icon={Icon.Shuffle}
                      shortcut={{
                        Windows: { modifiers: ["ctrl"], key: "r" },
                        macOS: { modifiers: ["cmd"], key: "r" },
                      }}
                      onAction={() => setRefreshKey((prev: number) => prev + 1)}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          );
        })()}

      <List.Section title="✨ Curated Dashboard">
        {(topPick?.fallbackMessage ||
          processedGames.rest[0]?.fallbackMessage) && (
          <List.Item
            key="fallback-warning"
            title="Timeframe Expanded"
            subtitle={
              topPick?.fallbackMessage ||
              processedGames.rest[0]?.fallbackMessage
            }
            icon={Icon.Info}
          />
        )}
        {processedGames.rest.map((item) => {
          const dynamicSubtitle = getDynamicSubtitle(
            item.reasonId,
            item.reasonPayload,
            item.game.appId,
            item.percentile,
            item.matchPercent,
            intent,
            item.displayTraits,
            item.topMatchedTraits,
            item.anchorTag,
            refreshKey,
            [
              ...(item.game.tags || []),
              ...(item.game.genres || []),
              ...(item.game.categories || []),
            ],
            item.game.playtime,
          );

          const visuals = getMatchVisuals(item, intent);

          return (
            <List.Item
              key={item.game.appId}
              icon={{
                source: `https://steamcdn-a.akamaihd.net/steam/apps/${item.game.appId}/library_600x900.jpg`,
                fallback: `https://steamcdn-a.akamaihd.net/steam/apps/${item.game.appId}/header.jpg`,
              }}
              title={truncateName(item.game.name)}
              subtitle={dynamicSubtitle}
              accessories={[
                ...(item.game.isInstalled === false
                  ? [
                      {
                        icon: Icon.Download,
                        tooltip: "Not Installed (In Library)",
                      },
                    ]
                  : []),
                ...(item.game.playtime > 0
                  ? [
                      {
                        text: formatTotalPlaytime(item.game.playtime),
                        icon: Icon.Clock,
                      },
                    ]
                  : [{ text: "Unplayed" }]),
                {
                  icon: { source: visuals.icon },
                  tooltip: visuals.tooltip,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Open
                    title={
                      item.game.isInstalled === false
                        ? "Install Game"
                        : "Launch Game"
                    }
                    target={`steam://rungameid/${item.game.appId}`}
                    icon={
                      item.game.isInstalled === false
                        ? Icon.Download
                        : Icon.Play
                    }
                  />
                  <Action.Open
                    title="Open Steam Page"
                    target={getSteamStoreUrl(
                      item.game.appId,
                      prefs.useSteamClient,
                    )}
                    icon={Icon.Window}
                  />
                  <Action
                    title="Skip Game"
                    icon={Icon.XMarkCircle}
                    shortcut={{
                      Windows: { modifiers: ["ctrl"], key: "s" },
                      macOS: { modifiers: ["cmd"], key: "s" },
                    }}
                    onAction={() =>
                      handleSkip(
                        item.game.appId,
                        item.game.name,
                        item.displayTraits,
                      )
                    }
                  />
                  <Action
                    title="Refresh Shuffle List"
                    icon={Icon.Shuffle}
                    shortcut={{
                      Windows: { modifiers: ["ctrl"], key: "r" },
                      macOS: { modifiers: ["cmd"], key: "r" },
                    }}
                    onAction={() => setRefreshKey((prev: number) => prev + 1)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {processedGames.rest.length + (topPick ? 1 : 0) > 0 &&
          processedGames.rest.length + (topPick ? 1 : 0) <
            parseInt(prefs.listLimit || "10", 10) && (
            <List.Item
              key="warning-item"
              title="Not Enough Matches"
              subtitle={`Found only ${processedGames.rest.length + (topPick ? 1 : 0)} suitable game(s). Could not fill the Top ${prefs.listLimit || "10"} list. Try adjusting filters.`}
              icon={Icon.Warning}
            />
          )}
      </List.Section>
    </List>
  );
}
