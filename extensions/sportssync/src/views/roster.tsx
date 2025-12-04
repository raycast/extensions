import { Detail, List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import sportInfo from "../utils/getSportInfo";

interface RosterItem {
  displayName: string;
  displayWeight: string;
  displayHeight: string;
  age: number;
  headshot?: {
    href: string;
  };
  jersey: string;
  injuries?: {
    status: string;
  }[];
  links: {
    href: string;
  }[];
  position?: {
    displayName: string;
  };
  team?: {
    displayName: string;
  };
}

interface Coach {
  firstName: string;
  lastName: string;
  experience?: string;
}

interface GroupedAthletes {
  items: RosterItem[];
}

interface RosterResponse {
  coach?: Coach[];
  athletes: GroupedAthletes[] | RosterItem[];
}

export default function RosterDetail({ teamId }: { teamId: string }) {
  // Preferences Info

  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  // Fetch Roster
  const {
    isLoading: rosterLoading,
    data: rosterData,
    revalidate: rosterRevalidate,
  } = useFetch<RosterResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/teams/${teamId}/roster`,
  );

  // Quick Access Variables

  const roster =
    Array.isArray(rosterData?.athletes) && "items" in rosterData.athletes[0]
      ? (rosterData.athletes as GroupedAthletes[]).flatMap((group) => group.items)
      : (rosterData?.athletes as RosterItem[]);
  const athletes = roster;
  const coachFirstName = rosterData?.coach?.[0]?.firstName ?? "Unknown";
  const coachLastName = rosterData?.coach?.[0]?.lastName ?? "Unknown";
  const coachExperience = rosterData?.coach?.[0]?.experience ?? "0";
  const headCoach = `${coachFirstName} ${coachLastName}`;

  const athletesArray = athletes?.map((athlete, index) => {
    const name = athlete?.displayName ?? "Unknown";
    const weight = athlete?.displayWeight ?? "Unknown";
    const height = athlete?.displayHeight ?? "Unknown";
    const formattedHeight = height?.replace(/\s+/g, "") ?? "Unknown";
    const headshot = athlete?.headshot?.href ?? Icon.Person;
    const jersey = athlete?.jersey ?? "Unknown";
    const health = athlete?.injuries?.[0]?.status;

    let healthIcon;
    let healthTooltip;

    if (!health) {
      healthIcon = { source: Icon.Heart, tintColor: Color.Green };
      healthTooltip = "Healthy";
    } else {
      healthIcon = { source: Icon.MedicalSupport, tintColor: Color.Orange };
      healthTooltip = "Injured";
    }

    return (
      <List.Item
        key={index}
        title={name}
        subtitle={athlete?.position?.displayName ?? "Unknown Position"}
        icon={headshot}
        accessories={[
          { tag: { value: jersey ?? "0", color: Color.Yellow }, icon: Icon.Hashtag, tooltip: "Jersey Number" },
          { tag: { value: formattedHeight ?? "0", color: Color.Yellow }, icon: Icon.Ruler, tooltip: "Height in ft" },
          { tag: { value: weight ?? "0", color: Color.Yellow }, icon: Icon.Weights, tooltip: "Weight in lbs" },
          { icon: healthIcon, tooltip: healthTooltip },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title={`View ${name}'s Profile on ESPN`}
              url={athlete?.links?.[0]?.href ?? `https://www.espn.com/${currentLeague}`}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={rosterRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  });

  // Api Stuff

  if (rosterLoading) {
    return <Detail isLoading={true} />;
  }

  if (!rosterData) {
    return <Detail markdown="No data found." />;
  }

  return (
    <List searchBarPlaceholder="Search for your roster or coach" isLoading={rosterLoading}>
      <List.Section title="Athletes">{athletesArray}</List.Section>

      <List.Section title="Head Coach">
        <List.Item
          title={`${headCoach}`}
          icon={Icon.Person}
          accessories={[
            {
              tag: {
                value: `${coachExperience} exp`,
                color: Color.Yellow,
              },
              icon: Icon.Clock,
              tooltip: "Years of Experience",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={rosterRevalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
