import { Detail, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import sportInfo from "../utils/getSportInfo";
import RosterDetail from "./roster";
import TeamSchedule from "./teamSchedule";

interface TeamResponse {
  team: Team;
}

interface Team {
  franchise: Franchise;
  logos?: Logo[];
  record?: {
    items?: RecordItem[];
  };
  standingSummary?: string;
  nextEvent?: Event[];
}

interface Franchise {
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  venue?: Venue;
}

interface Venue {
  fullName?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  images?: {
    href?: string;
  }[];
}

interface Logo {
  href?: string;
}

interface RecordItem {
  summary?: string;
}

interface Event {
  shortName?: string;
}

export default function TeamDetail({ teamId }: { teamId: string }) {
  // Preferences Info

  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  // Fetch Roster
  const {
    isLoading: teamLoading,
    data: teamData,
    revalidate: teamRevalidate,
  } = useFetch<TeamResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/teams/${teamId}`,
  );

  // Quick Access Variables

  const team = teamData?.team;

  const teamName = team?.franchise?.displayName ?? "Unknown";
  const teamLogo =
    team?.logos?.[0]?.href ??
    `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`;

  const overallRecord = team?.record?.items?.[0]?.summary ?? "Unknown";
  const homeRecord = team?.record?.items?.[1]?.summary ?? "Unknown";
  const awayRecord = team?.record?.items?.[2]?.summary ?? "Unknown";

  const standings = team?.standingSummary ?? "Unknown";
  const nextEvent = team?.nextEvent?.[0]?.shortName ?? "Unknown";

  const venue = team?.franchise?.venue?.fullName ?? "Unknown";
  const venueCity = team?.franchise?.venue?.address?.city ?? "Unknown";
  const venueState = team?.franchise?.venue?.address?.state ?? "Unknown";
  const venueCountry = team?.franchise?.venue?.address?.country ?? "Unknown";
  const venueAddress = `${venueCity}, ${venueState}, ${venueCountry}`;
  const venueImage =
    team?.franchise?.venue?.images?.[0]?.href ??
    `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`;

  const title = `# ${teamName}`;
  const venueImageMarkdown = `<img src="${venueImage}" width="500" height="300" />`;
  const nextEventMarkdown = `${nextEvent?.replace(" @ ", " vs ")}`;

  // Api Stuff

  if (teamLoading) {
    return <Detail isLoading={true} />;
  }

  if (!teamData) {
    return <Detail markdown="No data found." />;
  }

  return (
    <Detail
      isLoading={teamLoading}
      markdown={`${title}\n\n${venueImageMarkdown}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Overall Record">
            <Detail.Metadata.TagList.Item text={`${overallRecord}`} icon={teamLogo} color={Color.Yellow} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Home Record">
            <Detail.Metadata.TagList.Item text={`${homeRecord}`} icon={teamLogo} color={Color.Yellow} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Away Record">
            <Detail.Metadata.TagList.Item text={`${awayRecord}`} icon={teamLogo} color={Color.Yellow} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Standings Summary" text={`${standings}`} />
          <Detail.Metadata.Label title="Next Event" text={`${nextEventMarkdown}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Venue" text={`${venue}`} />
          <Detail.Metadata.Label title="Address" text={`${venueAddress}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {currentLeague !== "f1" && (
            <>
              <Action.Push
                title={`View ${teamName} Roster`}
                icon={Icon.TwoPeople}
                target={<RosterDetail teamId={teamId} />}
              />
              <Action.Push
                title={`View ${teamName} Schedule`}
                icon={Icon.Calendar}
                target={<TeamSchedule teamId={teamId} />}
              />
            </>
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={teamRevalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          ></Action>
        </ActionPanel>
      }
    />
  );
}
