import { Action, ActionPanel, Icon, List, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import getEndpoint from "./lib/endpoints";
import StandingsInterface, { Record as StandingsRecord, TeamRecord } from "./interfaces/standings";
import DivisionInterface, { DivisionElement } from "./interfaces/division";
import TeamsInterface from "./interfaces/teams";

type LeagueCode = "AL" | "NL";

interface Preferences {
  firstLeague?: LeagueCode; // optional, default AL
}

function currentSeason(): string {
  const now = new Date();
  return now.getFullYear().toString();
}

function leagueCodeFromId(leagueId: number): LeagueCode | undefined {
  if (leagueId === 103) return "AL";
  if (leagueId === 104) return "NL";
  return undefined;
}

type Args = {
  firstLeague?: LeagueCode;
};

export default function Standings(props: LaunchProps<{ arguments: Args }>) {
  const prefs = getPreferenceValues<Preferences>();
  const argLeague = props.arguments?.firstLeague as LeagueCode | undefined;
  const prefLeague = (prefs.firstLeague as LeagueCode) || undefined;
  const firstLeague: LeagueCode = argLeague || prefLeague || "AL";
  const secondLeague: LeagueCode = firstLeague === "AL" ? "NL" : "AL";
  const season = currentSeason();

  // Fetch standings for both leagues in one call
  const standingsUrl = `${getEndpoint("standings", {})}${new URLSearchParams({
    leagueId: "103,104",
    season,
    standingsTypes: "regularSeason",
  }).toString()}`;

  const { data: standings, isLoading: loadingStandings } = useFetch<StandingsInterface>(standingsUrl);

  // Fetch divisions metadata for names/abbreviations
  const divisionsUrl = `https://statsapi.mlb.com/api/v1/divisions`;
  const { data: divisions, isLoading: loadingDivisions } = useFetch<DivisionInterface>(divisionsUrl);

  // Fetch teams to derive website slugs
  const teamsUrl = `https://statsapi.mlb.com/api/v1/teams?${new URLSearchParams({
    sportId: "1",
    activeStatus: "yes",
  }).toString()}`;
  const { data: teamsData, isLoading: loadingTeams } = useFetch<TeamsInterface>(teamsUrl);

  const divisionById = useMemo(() => {
    const map = new Map<number, DivisionElement>();
    divisions?.divisions.forEach((d) => map.set(d.id, d));
    return map;
  }, [divisions]);

  const slugByTeamId = useMemo(() => {
    const map = new Map<number, string>();
    const slugify = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "") // remove non-alphanumeric
        .trim()
        .replace(/\s+/g, ""); // remove spaces entirely to match MLB slugs (e.g., whitesox)
    teamsData?.teams.forEach((t) => {
      const slug = slugify(t.clubName || t.teamName || t.name);
      map.set(t.id, slug);
    });
    return map;
  }, [teamsData]);

  // Group records by league and division
  const grouped = useMemo(() => {
    const groups: Record<LeagueCode, Record<number, TeamRecord[]>> = { AL: {}, NL: {} };
    standings?.records.forEach((rec: StandingsRecord) => {
      const leagueId = rec.league?.id as number;
      const code = leagueCodeFromId(leagueId);
      if (!code) return;
      const divId = rec.division?.id as number;
      if (!groups[code][divId]) groups[code][divId] = [];
      // Sort teams by divisionRank numeric
      const sortedTeams = [...rec.teamRecords].sort((a, b) => parseInt(a.divisionRank) - parseInt(b.divisionRank));
      groups[code][divId] = sortedTeams;
    });
    return groups;
  }, [standings]);

  const isLoading = loadingStandings || loadingDivisions || loadingTeams;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Season ${season} MLB Standings`}>
      {[firstLeague, secondLeague].map((leagueCode) => {
        const leagueGroups = grouped[leagueCode] || {};
        // Order divisions "East, Central, West" if available
        const divisionOrder = Object.keys(leagueGroups)
          .map((id) => parseInt(id, 10))
          .sort((a, b) => {
            const an = (divisionById.get(a)?.nameShort || "").toLowerCase();
            const bn = (divisionById.get(b)?.nameShort || "").toLowerCase();
            const order = ["east", "central", "west"]; // default order
            const ai = order.findIndex((o) => an.includes(o));
            const bi = order.findIndex((o) => bn.includes(o));
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });

        return divisionOrder.map((divId) => {
          const div = divisionById.get(divId);
          const title = `${div?.nameShort || "Division"}`;
          const teams = leagueGroups[divId] || [];
          return (
            <List.Section key={divId} title={title}>
              {teams.map((t) => {
                const iconPath = getEndpoint("logo", { teamId: t.team.id });
                return (
                  <List.Item
                    key={t.team.id}
                    title={t.team.name}
                    icon={{ source: iconPath, fallback: Icon.PersonCircle }}
                    accessories={[
                      { text: `W ${t.wins}` },
                      { text: `L ${t.losses}` },
                      { text: `${t.winningPercentage || "0.000"}` },
                      { text: `${t.divisionGamesBack === "-" ? "—-----" : `${t.divisionGamesBack} GB`}` },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          title="Open Team on MLB"
                          url={`https://www.mlb.com/${slugByTeamId.get(t.team.id) || `team/${t.team.id}`}`}
                        />
                        <Action.CopyToClipboard title="Copy Team Name" content={t.team.name} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        });
      })}
    </List>
  );
}
