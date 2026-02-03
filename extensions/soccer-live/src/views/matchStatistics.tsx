import { Detail, Color, Icon, Action, ActionPanel } from "@raycast/api";
import getMatchStats from "../utils/getMatchStats";

interface MatchStatisticsProps {
  gameId: string;
  leagueCode: string;
  matchName: string;
  homeScore?: string;
  awayScore?: string;
}

export default function MatchStatistics({
  gameId,
  leagueCode,
  homeScore: propHomeScore,
  awayScore: propAwayScore,
}: MatchStatisticsProps) {
  const { statsData, statsLoading, statsRevalidate } = getMatchStats(gameId, leagueCode);

  if (statsLoading) {
    return <Detail isLoading={true} markdown="Loading match statistics..." />;
  }

  if (!statsData) {
    return (
      <Detail
        markdown="## No Statistics Available\n\nStatistics for this match are not yet available."
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={statsRevalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const homeTeam = statsData.boxscore?.teams?.[1];
  const awayTeam = statsData.boxscore?.teams?.[0];

  if (!homeTeam || !awayTeam) {
    return (
      <Detail
        markdown="## Statistics Not Available\n\nDetailed statistics for this match are not yet available."
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={statsRevalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const homeStats = homeTeam.statistics || [];
  const awayStats = awayTeam.statistics || [];

  // Get score from props (passed from parent) or from competitions/boxscore as fallback
  const competition = statsData.competitions?.[0];
  const homeScore = propHomeScore || competition?.competitors?.[1]?.score || homeTeam.score || "0";
  const awayScore = propAwayScore || competition?.competitors?.[0]?.score || awayTeam.score || "0";

  // Get scoring plays and group by team
  const awayGoals: Array<{ scorer: string; minute: string }> = [];
  const homeGoals: Array<{ scorer: string; minute: string }> = [];

  // Normalize and collect scoring plays from all potential locations
  interface ScoringPlayData {
    team?: { id?: string; abbreviation?: string };
    clock?: { displayValue?: string };
    period?: { number?: number };
    participants?: Array<{ athlete?: { displayName?: string } }>;
    athletesInvolved?: Array<{ athlete?: { shortName?: string; displayName?: string } }>;
    text?: string;
  }

  const rawScoringPlays: ScoringPlayData[] = [
    ...(statsData.header?.competitions?.[0]?.details?.filter((d) => d.scoringPlay) || []),
    ...(statsData.scoringPlays || []),
    ...(statsData.plays?.scoring || []),
    ...(statsData.competitions?.[0]?.scoringPlays || []),
  ];

  // Deduplicate by a unique key (time + team + scorer) to avoid repeats if data is in multiple places
  const uniquePlays = new Map<string, ScoringPlayData>();
  rawScoringPlays.forEach((play) => {
    const teamId = play.team?.id || "";
    const minute = play.clock?.displayValue || play.period?.number || "";
    const scorerName =
      play.participants?.[0]?.athlete?.displayName ||
      play.athletesInvolved?.[0]?.athlete?.shortName ||
      play.athletesInvolved?.[0]?.athlete?.displayName ||
      play.text ||
      "";
    const key = `${minute}-${teamId}-${scorerName}`;
    if (!uniquePlays.has(key)) {
      uniquePlays.set(key, play);
    }
  });

  uniquePlays.forEach((play) => {
    const scorer =
      play.participants?.[0]?.athlete?.displayName ||
      play.athletesInvolved?.[0]?.athlete?.shortName ||
      play.athletesInvolved?.[0]?.athlete?.displayName ||
      play.text?.split(" - ")?.[0] ||
      "Unknown";

    const minute = play.clock?.displayValue || (play.period?.number ? `${play.period.number}'` : "");
    const goalInfo = { scorer, minute: minute.trim() };

    const playTeamId = String(play.team?.id || "");
    const playTeamAbbr = play.team?.abbreviation?.toUpperCase();

    const awayId = String(awayTeam.team.id || "");
    const awayAbbr = awayTeam.team.abbreviation?.toUpperCase();
    const homeId = String(homeTeam.team.id || "");
    const homeAbbr = homeTeam.team.abbreviation?.toUpperCase();

    if ((playTeamId && playTeamId === awayId) || (playTeamAbbr && playTeamAbbr === awayAbbr)) {
      awayGoals.push(goalInfo);
    } else if ((playTeamId && playTeamId === homeId) || (playTeamAbbr && playTeamAbbr === homeAbbr)) {
      homeGoals.push(goalInfo);
    }
  });

  const awayGoalsStr = awayGoals.map((g) => `${g.scorer} ${g.minute}`).join(", ");
  const homeGoalsStr = homeGoals.map((g) => `${g.scorer} ${g.minute}`).join(", ");

  // Create header markdown
  let statsMarkdown = `| | | |\n`;
  statsMarkdown += `| :---: | :---: | :---: |\n`;
  statsMarkdown += `| **${awayTeam.team.displayName}** | **${awayScore} - ${homeScore}** | **${homeTeam.team.displayName}** |\n`;

  // Use a soccer ball if there are no goals to maintain the layout, or show the scorers
  statsMarkdown += `| ${awayGoalsStr} | ⚽ | ${homeGoalsStr} |\n\n`;
  statsMarkdown += `---\n\n`;

  // Lineups: in-field (starters), reserves (bench), and managers (ESPN uses "rosters" key)
  const awayId = String(awayTeam.team.id || "");
  const homeId = String(homeTeam.team.id || "");
  const rosterData = statsData.rosters ?? statsData.roster ?? [];
  type RosterItem = (typeof rosterData)[number];
  const getHomeAway = (r: RosterItem) => (r as { homeAway?: string }).homeAway;
  const rosterTeamId = (r: RosterItem) => String(r.team?.id || "");

  // 1) Assign by API homeAway first so we get one roster per slot (ESPN labels each roster)
  let awayRoster: RosterItem | undefined = rosterData.find((r: RosterItem) => getHomeAway(r) === "away");
  let homeRoster: RosterItem | undefined = rosterData.find((r: RosterItem) => getHomeAway(r) === "home");

  // 2) Never show the other side's roster: if a roster's team.id is the opposite side, clear it
  if (awayRoster && rosterTeamId(awayRoster) === homeId) awayRoster = undefined;
  if (homeRoster && rosterTeamId(homeRoster) === awayId) homeRoster = undefined;

  // 3) Fill gaps by team.id match
  if (!awayRoster) awayRoster = rosterData.find((r: RosterItem) => rosterTeamId(r) === awayId);
  if (!homeRoster) homeRoster = rosterData.find((r: RosterItem) => rosterTeamId(r) === homeId && r !== awayRoster);

  // 4) Same roster or same team id: show only for the matching side
  if (awayRoster && homeRoster) {
    const sameRef = awayRoster === homeRoster;
    const sameTid = rosterTeamId(awayRoster) === rosterTeamId(homeRoster);
    if (sameRef || sameTid) {
      const tid = rosterTeamId(awayRoster);
      if (tid === awayId) homeRoster = undefined;
      else awayRoster = undefined;
    } else {
      // 5) Content dedup: same starters = duplicate (API often sends home lineup for both). Use athlete.id when present.
      const starterIds = (r: RosterItem) => {
        const starters = (r.roster || []).filter((p) => p.starter === true);
        return starters
          .map((p) => String((p.athlete as { id?: string } | undefined)?.id ?? p.jersey ?? "").trim())
          .filter(Boolean)
          .sort()
          .join(",");
      };
      const fallbackSig = (r: RosterItem) => {
        const starters = (r.roster || []).filter((p) => p.starter === true);
        return starters
          .map(
            (p) =>
              (p.jersey ?? (p.athlete as { jersey?: string } | undefined)?.jersey ?? "") +
              ":" +
              (p.athlete?.displayName || p.athlete?.shortName || ""),
          )
          .sort()
          .join("|");
      };
      const awaySig = starterIds(awayRoster) || fallbackSig(awayRoster);
      const homeSig = starterIds(homeRoster) || fallbackSig(homeRoster);
      if (awaySig.length > 0 && awaySig === homeSig) {
        awayRoster = undefined;
      }
    }
  }

  const formatPlayer = (entry: {
    athlete?: { displayName?: string; shortName?: string; jersey?: string };
    jersey?: string;
  }) => {
    const name = entry.athlete?.displayName || entry.athlete?.shortName || "—";
    const jersey = entry.jersey ?? entry.athlete?.jersey;
    return jersey ? jersey + ". " + name : name;
  };

  /** Short name for field map (last name or shortName) */
  const shortName = (entry: {
    athlete?: { displayName?: string; shortName?: string };
    position?: { abbreviation?: string };
  }) => {
    const d = entry.athlete?.displayName || entry.athlete?.shortName || "";
    const parts = d.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : d || "—";
  };

  /**
   * Map position (abbreviation or displayName) to one of four lines: 0 = GK, 1 = Defense, 2 = Midfield, 3 = Attack.
   * Uses both abbreviation and displayName so we handle ESPN and other API formats.
   */
  const positionToLine = (abbr: string, displayName?: string): 0 | 1 | 2 | 3 => {
    const u = (abbr || "").toUpperCase();
    const d = (displayName || "").toLowerCase();

    // Goalkeeper
    if (u === "G" || u === "GK" || d.includes("goalkeeper") || d.includes("keeper")) return 0;
    // Defense
    if (
      u === "D" ||
      u === "DF" ||
      u === "CB" ||
      u === "LB" ||
      u === "RB" ||
      u.includes("WB") ||
      u === "SW" ||
      d.includes("defender") ||
      d.includes("defence") ||
      d.includes("back")
    )
      return 1;
    // Attack / Forward
    if (
      u === "F" ||
      u === "FW" ||
      u === "ST" ||
      u === "CF" ||
      u === "LW" ||
      u === "RW" ||
      d.includes("forward") ||
      d.includes("striker") ||
      d.includes("winger")
    )
      return 3;
    // Midfield (default)
    if (
      u === "M" ||
      u === "MF" ||
      u === "MD" ||
      u === "CM" ||
      u === "CDM" ||
      u === "CAM" ||
      u === "LM" ||
      u === "RM" ||
      u === "AM" ||
      d.includes("midfielder") ||
      d.includes("midfield")
    )
      return 2;
    return 2;
  };

  /**
   * When position is missing, infer line from formationPlace (1=GK, 2–5 often DEF, 6–8 MID, 9–11 FWD for many formations).
   */
  const formationPlaceToLine = (place: number): 0 | 1 | 2 | 3 => {
    if (place === 1) return 0;
    if (place >= 2 && place <= 5) return 1;
    if (place >= 6 && place <= 8) return 2;
    if (place >= 9 && place <= 11) return 3;
    return 2; // unknown place → midfield
  };

  /** Build a text-based field map with exactly four lines: GK, Defense, Midfield, Attack */
  const buildFormationFieldMap = (teamName: string, roster: (typeof rosterData)[number] | undefined): string => {
    if (!roster?.roster?.length) return "";
    const starters = roster.roster.filter((p) => p.starter === true);
    if (starters.length === 0) return "";

    type Starter = (typeof starters)[0];
    const fourLines: [Starter[], Starter[], Starter[], Starter[]] = [[], [], [], []];

    starters.forEach((p) => {
      const abbr =
        p.position?.abbreviation ||
        (p.athlete as { position?: { abbreviation?: string } } | undefined)?.position?.abbreviation ||
        "";
      const displayName =
        p.position?.displayName ||
        (p.athlete as { position?: { displayName?: string } } | undefined)?.position?.displayName ||
        "";
      const place = parseInt((p as { formationPlace?: string }).formationPlace || "0", 10);

      let lineIndex: 0 | 1 | 2 | 3;
      if (abbr || displayName) {
        lineIndex = positionToLine(abbr, displayName);
      } else {
        lineIndex = formationPlaceToLine(place);
      }
      fourLines[lineIndex].push(p);
    });

    // Sort each line by formationPlace so left-to-right order on the field is correct
    const sortByPlace = (a: Starter, b: Starter) => {
      const pa = parseInt((a as { formationPlace?: string }).formationPlace || "99", 10);
      const pb = parseInt((b as { formationPlace?: string }).formationPlace || "99", 10);
      return pa - pb;
    };
    fourLines[0].sort(sortByPlace);
    fourLines[1].sort(sortByPlace);
    fourLines[2].sort(sortByPlace);
    fourLines[3].sort(sortByPlace);

    // Formation string: DEF - MID - FWD (e.g. 4-3-3, 3-4-1-2)
    const formationStr = [fourLines[1].length, fourLines[2].length, fourLines[3].length]
      .filter((n) => n > 0)
      .join(" - ");

    const fieldWidth = 44;
    const center = (s: string) => {
      const n = fieldWidth - s.length;
      const left = Math.max(0, Math.floor(n / 2));
      return " ".repeat(left) + s + " ".repeat(Math.max(0, n - left));
    };

    const formatSlot = (p: Starter) =>
      "#" + (p.jersey ?? (p.athlete as { jersey?: string } | undefined)?.jersey ?? "?") + " " + shortName(p);

    const linesMd: string[] = [];
    // Line 0: Goalkeeper
    if (fourLines[0].length) {
      linesMd.push(center(fourLines[0].map(formatSlot).join("   ")));
    }
    // Line 1: Defense
    if (fourLines[1].length) {
      linesMd.push(center(fourLines[1].map(formatSlot).join("   ")));
    }
    // Line 2: Midfield
    if (fourLines[2].length) {
      linesMd.push(center(fourLines[2].map(formatSlot).join("   ")));
    }
    // Line 3: Attack
    if (fourLines[3].length) {
      linesMd.push(center(fourLines[3].map(formatSlot).join("   ")));
    }

    let block = "#### " + teamName + "\n\n";
    if (formationStr) block += "**Formation:** " + formationStr + "\n\n";
    block += "```\n" + linesMd.join("\n") + "\n```\n\n";
    return block;
  };

  const buildLineupSection = (teamName: string, roster: (typeof rosterData)[number] | undefined) => {
    if (!roster?.roster?.length) return "";
    const reserves = roster.roster.filter((p) => p.starter !== true);
    const coaches = roster.coaches || [];
    const managerStr =
      coaches.length > 0
        ? coaches
            .map((c) => c.displayName || c.shortName)
            .filter(Boolean)
            .join(", ")
        : null;

    let section = "#### " + teamName + "\n\n";
    if (managerStr) {
      section += "**Manager:** " + managerStr + "\n\n";
    }
    if (reserves.length > 0) {
      section += "**Reserves:** " + reserves.map(formatPlayer).join(" · ") + "\n\n";
    }
    return section;
  };

  // Match Formations: text field map (formation view) + link to ESPN lineups page
  const awayFieldMap = buildFormationFieldMap(awayTeam.team.displayName, awayRoster);
  const homeFieldMap = buildFormationFieldMap(homeTeam.team.displayName, homeRoster);
  const formationFallback = (teamName: string, map: string) =>
    map || "#### " + teamName + "\n\nLineup not available.\n\n";
  const espnLineupsUrl = "https://www.espn.com/soccer/lineups/_/gameId/" + gameId;
  if (awayFieldMap || homeFieldMap || rosterData.length > 0) {
    statsMarkdown += "### Match Formations\n\n";
    statsMarkdown += formationFallback(awayTeam.team.displayName, awayFieldMap);
    statsMarkdown += formationFallback(homeTeam.team.displayName, homeFieldMap);
    statsMarkdown += "**View full formation on ESPN:** [Open lineups & field map](" + espnLineupsUrl + ")\n\n";
    statsMarkdown += "---\n\n";
  }

  const awayLineup = buildLineupSection(awayTeam.team.displayName, awayRoster);
  const homeLineup = buildLineupSection(homeTeam.team.displayName, homeRoster);
  if (awayLineup || homeLineup) {
    statsMarkdown += "### Reserves\n\n";
    if (awayLineup) statsMarkdown += awayLineup;
    if (homeLineup) statsMarkdown += homeLineup;
    statsMarkdown += "---\n\n";
  }

  statsMarkdown += `### 📊 Match Statistics\n\n`;

  // Define stat categories and priorities (standalone = shown first without category header, e.g. Possession)
  type StatCategory = "standalone" | "offensive" | "defensive" | "possession" | "discipline" | "other" | "hidden";

  interface StatInfo {
    away: string;
    home: string;
    displayName: string;
    category: StatCategory;
    priority: number;
    originalName?: string;
    originalDisplayName?: string;
  }

  // Normalize stat names to clearer, more consistent display names with type indicators
  const normalizeStatName = (statName: string, displayName: string, displayValue?: string): string => {
    const name = statName.toLowerCase();
    const display = displayName.toLowerCase();
    const value = (displayValue || "").toLowerCase();

    // Combine name and display for better pattern matching
    const combined = `${name} ${display}`.toLowerCase();

    // Check if value is a percentage
    const isPercentage =
      value.includes("%") ||
      name.includes("percent") ||
      display.includes("percent") ||
      name.includes("accuracy") ||
      display.includes("accuracy") ||
      name.includes("possession") ||
      display.includes("possession");

    // Create a mapping for clearer names with type indicators
    if (name.includes("goal") || display.includes("goal")) {
      return "Goals";
    }
    // Handle shot statistics - check for specific types first (most specific to least specific)
    if (name.includes("shot") || display.includes("shot") || combined.includes("shot")) {
      // Check for shot accuracy/percentage first (most specific)
      if (
        combined.includes("accuracy") ||
        combined.includes("pct") ||
        combined.includes("percent") ||
        value.includes("%") ||
        value.match(/^0\.\d+$/) ||
        name.includes("shotaccuracy") ||
        name.includes("shotpct") ||
        name.includes("shotpercent") ||
        display.includes("shotaccuracy") ||
        display.includes("shotpct") ||
        display.includes("shotpercent")
      ) {
        return "Shot Accuracy %";
      }
      // Check for shots on target (various naming patterns - check combined string for better matching)
      if (
        combined.includes("on target") ||
        combined.includes("ontarget") ||
        combined.includes("on goal") ||
        combined.includes("ongoal") ||
        combined.includes("ontarget") ||
        name.includes("shotsontarget") ||
        name.includes("shotsOnTarget") ||
        name.includes("shotsonTarget") ||
        name.includes("shotOnTarget") ||
        name.includes("shotontarget") ||
        display.includes("shotsontarget") ||
        display.includes("shotsOnTarget") ||
        (combined.includes("shot") &&
          (combined.includes("on") || combined.includes("target")) &&
          !combined.includes("accuracy") &&
          !combined.includes("pct") &&
          !value.includes("%") &&
          !value.match(/^0\.\d+$/))
      ) {
        return "Shots on Target";
      }
      // Check for total shots (default for generic "shots" stat)
      if (
        combined.includes("total") ||
        name === "shots" ||
        display === "shots" ||
        name === "shot" ||
        display === "shot" ||
        name.includes("shotstotal") ||
        name.includes("shotsTotal") ||
        display.includes("shotstotal") ||
        display.includes("shotsTotal") ||
        (combined.includes("shot") &&
          !combined.includes("on") &&
          !combined.includes("target") &&
          !combined.includes("accuracy") &&
          !combined.includes("pct") &&
          !value.includes("%") &&
          !value.match(/^0\.\d+$/))
      ) {
        return "Total Shots";
      }
      // Default to just "Shots" if none of the above match
      return "Shots";
    }
    if (name.includes("assist") || display.includes("assist")) {
      return "Assists";
    }
    if (name.includes("corner") || display.includes("corner")) {
      return "Corner Kicks";
    }
    if (name.includes("cross") || display.includes("cross")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Crosses";
      }
      return "Crosses";
    }
    if (name.includes("offside") || display.includes("offside")) {
      return "Offsides";
    }
    if (name.includes("tackle") || display.includes("tackle")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Tackles";
      }
      if (name.includes("won") || display.includes("won")) {
        return "Tackles Won";
      }
      return "Tackles";
    }
    if (name.includes("intercept") || display.includes("intercept")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Interceptions";
      }
      return "Interceptions";
    }
    if (name.includes("clearance") || display.includes("clearance")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Clearances";
      }
      return "Clearances";
    }
    if (name.includes("block") && (name.includes("shot") || display.includes("shot"))) {
      return "Blocked Shots";
    }
    if (name.includes("block") || display.includes("block")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Blocks";
      }
      return "Blocks";
    }
    if (name.includes("save") || display.includes("save")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Saves";
      }
      return "Saves";
    }
    if (name.includes("foul") || display.includes("foul")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Fouls";
      }
      if (name.includes("committed") || display.includes("committed")) {
        return "Fouls Committed";
      }
      return "Fouls";
    }
    if (name.includes("possession") || display.includes("possession")) {
      return "Possession %";
    }
    if (
      (name.includes("pass") || display.includes("pass")) &&
      (name.includes("accuracy") || display.includes("accuracy"))
    ) {
      return "Pass Accuracy %";
    }
    if (name.includes("pass") || display.includes("pass")) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Passes";
      }
      if (name.includes("completed") || display.includes("completed")) {
        return "Passes Completed";
      }
      if (name.includes("attempted") || display.includes("attempted")) {
        return "Passes Attempted";
      }
      return "Passes";
    }
    if (name.includes("yellow") || (name.includes("card") && display.includes("yellow"))) {
      return "Yellow Cards";
    }
    if (name.includes("red") || (name.includes("card") && display.includes("red"))) {
      return "Red Cards";
    }
    if (name.includes("duel") || display.includes("duel")) {
      if (name.includes("won") || display.includes("won")) {
        return "Duels Won";
      }
      if (name.includes("total") || display.includes("total")) {
        return "Total Duels";
      }
      return "Duels";
    }
    if (name.includes("aerial") || display.includes("aerial")) {
      if (name.includes("won") || display.includes("won")) {
        return "Aerial Duels Won";
      }
      return "Aerial Duels";
    }
    if (name.includes("dribble") || display.includes("dribble")) {
      if (name.includes("attempted") || display.includes("attempted")) {
        return "Dribbles Attempted";
      }
      if (name.includes("won") || display.includes("won")) {
        return "Dribbles Won";
      }
      return "Dribbles";
    }
    if (name.includes("key pass") || display.includes("key pass")) {
      return "Key Passes";
    }
    if (name.includes("long pass") || display.includes("long pass")) {
      if (name.includes("accuracy") || display.includes("accuracy")) {
        return "Long Pass Accuracy %";
      }
      return "Long Passes";
    }
    if (name.includes("short pass") || display.includes("short pass")) {
      if (name.includes("accuracy") || display.includes("accuracy")) {
        return "Short Pass Accuracy %";
      }
      return "Short Passes";
    }
    if (
      name.includes("long ball") ||
      display.includes("long ball") ||
      name.includes("longball") ||
      display.includes("longball")
    ) {
      if (name.includes("total") || display.includes("total")) {
        return "Total Long Balls";
      }
      if (name.includes("accurate") || display.includes("accurate")) {
        return "Accurate Long Balls";
      }
      if (name.includes("pct") || display.includes("pct") || name.includes("%") || display.includes("%")) {
        return "Long Ball %";
      }
      return "Long Balls";
    }

    // For unknown stats, check if it's a percentage and add indicator
    let baseName = displayName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    if (isPercentage && !baseName.includes("%")) {
      baseName += " %";
    } else if (
      !isPercentage &&
      (name.includes("total") || display.includes("total")) &&
      !baseName.toLowerCase().includes("total")
    ) {
      baseName = "Total " + baseName;
    }

    return baseName;
  };

  // Map stat names to categories and priorities (lower number = higher priority)
  const getStatCategory = (statName: string, displayName: string): { category: StatCategory; priority: number } => {
    const name = statName.toLowerCase();
    const display = displayName.toLowerCase();

    // Standalone: Possession shown first without a category header
    if (name.includes("possession") || display.includes("possession")) {
      return { category: "standalone", priority: 1 };
    }

    // Goals: hidden (not shown in stats at all)
    if (name.includes("goal") || display.includes("goal")) {
      return { category: "hidden", priority: 1 };
    }

    // Offensive stats (includes Total Passes)
    if (name.includes("shot") || display.includes("shot")) {
      if (name.includes("on target") || display.includes("on target")) {
        return { category: "offensive", priority: 1 };
      }
      return { category: "offensive", priority: 2 };
    }
    if (name.includes("assist") || display.includes("assist")) {
      return { category: "offensive", priority: 3 };
    }
    if (name.includes("corner") || display.includes("corner")) {
      return { category: "offensive", priority: 4 };
    }
    if (name.includes("cross") || display.includes("cross")) {
      return { category: "offensive", priority: 5 };
    }
    if (name.includes("offside") || display.includes("offside")) {
      return { category: "offensive", priority: 6 };
    }
    // Total Passes in offensive (not possession)
    if (name.includes("pass") || display.includes("pass")) {
      if (name.includes("accuracy") || display.includes("accuracy")) {
        return { category: "possession", priority: 1 };
      }
      return { category: "offensive", priority: 7 };
    }

    // Defensive stats
    if (name.includes("tackle") || display.includes("tackle")) {
      return { category: "defensive", priority: 1 };
    }
    if (name.includes("intercept") || display.includes("intercept")) {
      return { category: "defensive", priority: 2 };
    }
    if (name.includes("clearance") || display.includes("clearance")) {
      return { category: "defensive", priority: 3 };
    }
    if (name.includes("block") || display.includes("block")) {
      return { category: "defensive", priority: 4 };
    }
    if (name.includes("save") || display.includes("save")) {
      return { category: "defensive", priority: 5 };
    }
    if (name.includes("foul") || display.includes("foul")) {
      return { category: "defensive", priority: 6 };
    }

    // Discipline stats
    if (name.includes("yellow") || display.includes("yellow") || (name.includes("card") && !name.includes("red"))) {
      return { category: "discipline", priority: 1 };
    }
    if (name.includes("red") || display.includes("red")) {
      return { category: "discipline", priority: 2 };
    }

    // Default to other category
    return { category: "other", priority: 99 };
  };

  // Match up statistics by name
  const statMap = new Map<string, StatInfo>();

  awayStats.forEach((stat) => {
    const rawDisplayName = stat.displayName || stat.name;
    const { category, priority } = getStatCategory(stat.name, rawDisplayName);
    // Use both stat.name and displayName for better detection
    const normalizedName = normalizeStatName(stat.name, rawDisplayName, stat.displayValue);
    statMap.set(stat.name, {
      away: stat.displayValue || "0",
      home: "0",
      displayName: normalizedName,
      category,
      priority,
      originalName: stat.name, // Store original name for better filtering
      originalDisplayName: rawDisplayName,
    });
  });

  homeStats.forEach((stat) => {
    const rawDisplayName = stat.displayName || stat.name;
    if (!statMap.has(stat.name)) {
      const { category, priority } = getStatCategory(stat.name, rawDisplayName);
      const normalizedName = normalizeStatName(stat.name, rawDisplayName, stat.displayValue);
      statMap.set(stat.name, {
        away: "0",
        home: stat.displayValue || "0",
        displayName: normalizedName,
        category,
        priority,
        originalName: stat.name,
        originalDisplayName: rawDisplayName,
      });
    } else {
      const existing = statMap.get(stat.name)!;
      existing.home = stat.displayValue || "0";
      // Re-normalize with both away and home values to get better detection
      const betterName = normalizeStatName(stat.name, rawDisplayName, stat.displayValue || existing.away);
      if (
        betterName !== existing.displayName &&
        (betterName.includes("%") || betterName.includes("Total") || betterName.includes("on Target"))
      ) {
        existing.displayName = betterName;
      }
      statMap.set(stat.name, existing);
    }
  });

  // Filter stats to keep only the most important ones (Total, Percentage, and key metrics)
  const filterImportantStats = (stats: StatInfo[]): StatInfo[] => {
    // Group stats by base type (e.g., "shots", "passes", "tackles")
    const statGroups = new Map<string, StatInfo[]>();

    stats.forEach((stat) => {
      const displayLower = stat.displayName.toLowerCase();
      const originalNameLower = (stat.originalName || "").toLowerCase();
      const originalDisplayLower = (stat.originalDisplayName || "").toLowerCase();
      let baseType = "";

      // Identify base stat type - check both display name and original names
      if (
        displayLower.includes("shot") ||
        originalNameLower.includes("shot") ||
        originalDisplayLower.includes("shot")
      ) {
        baseType = "shots";
      } else if (displayLower.includes("pass")) {
        baseType = "passes";
      } else if (displayLower.includes("tackle")) {
        baseType = "tackles";
      } else if (displayLower.includes("cross")) {
        baseType = "crosses";
      } else if (displayLower.includes("long ball") || displayLower.includes("longball")) {
        baseType = "longballs";
      } else if (displayLower.includes("dribble")) {
        baseType = "dribbles";
      } else if (displayLower.includes("duel")) {
        baseType = "duels";
      } else if (displayLower.includes("aerial")) {
        baseType = "aerial";
      } else if (displayLower.includes("intercept")) {
        baseType = "interceptions";
      } else if (displayLower.includes("clearance")) {
        baseType = "clearances";
      } else if (displayLower.includes("block")) {
        baseType = "blocks";
      } else if (displayLower.includes("foul")) {
        baseType = "fouls";
      } else {
        // For other stats, use the display name as the base type
        baseType = stat.displayName.toLowerCase();
      }

      if (!statGroups.has(baseType)) {
        statGroups.set(baseType, []);
      }
      statGroups.get(baseType)!.push(stat);
    });

    const filteredStats: StatInfo[] = [];

    statGroups.forEach((groupStats) => {
      // If only one stat of this type, keep it
      if (groupStats.length === 1) {
        filteredStats.push(groupStats[0]);
        return;
      }

      // For multiple stats of the same type, keep only important ones
      const importantStats: StatInfo[] = [];

      // Priority order: Total, Percentage, then key metrics
      const totalStat = groupStats.find(
        (s) => s.displayName.toLowerCase().includes("total") && !s.displayName.toLowerCase().includes("%"),
      );
      const percentageStat = groupStats.find(
        (s) =>
          s.displayName.toLowerCase().includes("%") ||
          s.displayName.toLowerCase().includes("pct") ||
          s.displayName.toLowerCase().includes("accuracy"),
      );
      const onTargetStat = groupStats.find((s) => s.displayName.toLowerCase().includes("on target"));
      const accurateStat = groupStats.find(
        (s) => s.displayName.toLowerCase().includes("accurate") && !s.displayName.toLowerCase().includes("%"),
      );
      const wonStat = groupStats.find((s) => s.displayName.toLowerCase().includes("won"));
      const completedStat = groupStats.find((s) => s.displayName.toLowerCase().includes("completed"));

      // Add stats in priority order
      if (totalStat) importantStats.push(totalStat);
      if (onTargetStat) importantStats.push(onTargetStat);
      if (accurateStat) importantStats.push(accurateStat);
      if (wonStat) importantStats.push(wonStat);
      if (completedStat) importantStats.push(completedStat);
      if (percentageStat) importantStats.push(percentageStat);

      // If no important stats found, keep the first one (shouldn't happen, but safety)
      if (importantStats.length === 0 && groupStats.length > 0) {
        importantStats.push(groupStats[0]);
      }

      filteredStats.push(...importantStats);
    });

    return filteredStats;
  };

  // Group stats by category and sort by priority
  // standalone = first, no category header (e.g. Possession)
  const categoryOrder: StatCategory[] = ["standalone", "offensive", "defensive", "possession", "discipline", "other"];
  const categoryLabels: Record<StatCategory, string> = {
    standalone: "",
    offensive: "⚽ Offensive",
    defensive: "🛡️ Defensive",
    possession: "🎯 Possession",
    discipline: "📋 Discipline",
    other: "📊 Other",
    hidden: "",
  };

  categoryOrder.forEach((category) => {
    const categoryStats = Array.from(statMap.values())
      .filter((stat) => stat.category === category)
      .sort((a, b) => a.priority - b.priority);

    // Filter to keep only important stats
    const filteredCategoryStats = filterImportantStats(categoryStats);

    if (filteredCategoryStats.length > 0) {
      // Standalone category (e.g. Possession) has no header
      if (category !== "standalone") {
        statsMarkdown += `\n#### ${categoryLabels[category]}\n\n`;
      }
      statsMarkdown += `| | | |\n`;
      statsMarkdown += `| :--- | :---: | ---: |\n`;

      filteredCategoryStats.forEach((stat) => {
        statsMarkdown += `| ${stat.away} | **${stat.displayName}** | ${stat.home} |\n`;
      });
    }
  });

  return (
    <Detail
      markdown={statsMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Match Details" />
          <Detail.Metadata.Label title="Away" text={awayTeam.team.displayName} icon={awayTeam.team.logo} />
          <Detail.Metadata.Label title="Home" text={homeTeam.team.displayName} icon={homeTeam.team.logo} />
          <Detail.Metadata.Separator />
          {statsData.leaders &&
            statsData.leaders.map((leader, index) => {
              const teamLabel = index === 0 ? "Away Leaders" : "Home Leaders";
              return (
                <Detail.Metadata.TagList key={index} title={teamLabel}>
                  {leader.leaders?.slice(0, 3).map((category, catIndex) => {
                    const topLeader = category.leaders?.[0];
                    if (!topLeader) return null;
                    return (
                      <Detail.Metadata.TagList.Item
                        key={catIndex}
                        text={`${topLeader.athlete?.shortName}: ${topLeader.displayValue}`}
                        color={Color.Blue}
                      />
                    );
                  })}
                </Detail.Metadata.TagList>
              );
            })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={statsRevalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.OpenInBrowser title="View on Espn" url={`https://www.espn.com/soccer/match?gameId=${gameId}`} />
          <Action.OpenInBrowser
            title="View Formation on Espn"
            url={`https://www.espn.com/soccer/lineups/_/gameId/${gameId}`}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel>
      }
    />
  );
}
