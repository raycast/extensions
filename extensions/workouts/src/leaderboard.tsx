import { useCachedPromise, useLocalStorage, withAccessToken } from "@raycast/utils";
import { getClubActivities, getClubs, provider } from "./api/client";
import { useEffect } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { formatDistance, formatDuration, getSportTypesFromActivityTypes, getStartOfWeekUnix } from "./utils";
import { StravaClubActivity, StravaSummaryClub } from "./api/types";
import { sportIcons } from "./constants";

const SEARCHBAR_PLACEHOLDER = "Search club members";
const PAGE_SIZE = 100;

function withClubs(Component: React.FC<{ clubs: StravaSummaryClub[] }>) {
  return function ClubsWrapper() {
    const { data: clubs, isLoading, error } = useCachedPromise(getClubs, []);

    useEffect(() => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load clubs",
          message: error.message,
        });
      }
    }, [error]);

    if (isLoading) {
      return <List isLoading searchBarPlaceholder={SEARCHBAR_PLACEHOLDER} />;
    }

    if (clubs === undefined) {
      return (
        <List>
          <List.EmptyView title="No clubs found" />
        </List>
      );
    }

    return <Component clubs={clubs} />;
  };
}

export type AthleteActivities = {
  [key: string]: {
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    activities: StravaClubActivity[];
  };
};

function Leaderboard({ clubs }: { clubs: StravaSummaryClub[] }) {
  const { value, setValue: setClubId } = useLocalStorage("lastClubId", clubs[0].id.toString());
  const clubId = value || "";

  const startOfWeek = getStartOfWeekUnix();
  const weekString = `${new Date(startOfWeek * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - Today`;

  const {
    isLoading,
    data: activities,
    pagination,
    error,
  } = useCachedPromise(
    (club: string) => async (options: { page: number }) => {
      if (!club) return { data: [], hasMore: false };
      const newData = await getClubActivities(club, options.page + 1, PAGE_SIZE, startOfWeek);
      return { data: newData, hasMore: newData.length === PAGE_SIZE };
    },
    [clubId],
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load leaderboard",
        message: error.message,
      });
    }
  }, [error]);

  const club = clubs.find((club) => club.id.toString() === clubId);
  if (!club) {
    return (
      <List>
        <List.EmptyView title="No clubs found" />
      </List>
    );
  }
  const clubSportTypes = getSportTypesFromActivityTypes(club.activity_types, club.localized_sport_type);

  const activitiesPerAthlete = activities
    ? activities
        .filter((activity) => clubSportTypes.includes(activity.sport_type))
        .reduce((acc: AthleteActivities, activity) => {
          const athleteName = `${activity.athlete.firstname} ${activity.athlete.lastname}`;
          if (!acc[athleteName]) {
            acc[athleteName] = {
              name: athleteName,
              elapsed_time: 0,
              moving_time: 0,
              distance: 0,
              activities: [],
            };
          }
          acc[athleteName].activities.push(activity);
          acc[athleteName].elapsed_time += activity.elapsed_time;
          acc[athleteName].moving_time += activity.moving_time;
          acc[athleteName].distance += activity.distance;
          return acc;
        }, {})
    : {};

  function getActivitiesName(plural = true) {
    if (club?.sport_type === "running") {
      return plural ? "runs" : "run";
    } else if (club?.sport_type === "cycling") {
      return plural ? "rides" : "ride";
    } else {
      return plural ? "activities" : "activity";
    }
  }

  return (
    <List
      searchBarPlaceholder={SEARCHBAR_PLACEHOLDER}
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Select Club" value={clubId} onChange={(newValue) => setClubId(newValue)}>
          {clubs?.map((club) => (
            <List.Dropdown.Item key={club.id} title={club.name} value={club.id.toString()} icon={club.profile_medium} />
          ))}
        </List.Dropdown>
      }
    >
      {!activities?.length && !isLoading && <List.EmptyView title={`No ${getActivitiesName()} this week`} />}
      <List.Section title={weekString}>
        {activities
          ? Object.entries(activitiesPerAthlete)
              ?.sort((a, b) => b[1].moving_time - a[1].moving_time)
              ?.map(([name, data], i) => {
                return (
                  <List.Item
                    key={name}
                    title={name}
                    icon={
                      i === 0
                        ? {
                            source: Icon.Trophy,
                            tintColor: Color.Yellow,
                          }
                        : Icon[(`Number${i < 9 ? 0 : ""}${i + 1}` as keyof typeof Icon) || "Dot"]
                    }
                    accessories={[
                      {
                        text: `${data.activities.length} ${getActivitiesName(data.activities.length > 1)}`,
                        tooltip: `Number of ${getActivitiesName(data.activities.length > 1)}`,
                      },
                      { text: formatDuration(data.moving_time), icon: Icon.Clock, tooltip: "Moving Time" },
                      { text: formatDistance(data.distance), icon: Icon.ArrowRight, tooltip: "Distance" },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title={data.activities.length === 1 ? "View Activity" : "View Activities"}
                          icon={Icon.Eye}
                          target={<ClubActivities activities={data.activities} />}
                        />
                        <Action.OpenInBrowser
                          title="View Club on Strava"
                          url={`https://www.strava.com/clubs/${clubId}`}
                          shortcut={{ modifiers: ["cmd"], key: "o" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })
          : null}
      </List.Section>
    </List>
  );
}

function ClubActivities({ activities }: { activities: StravaClubActivity[] }) {
  return (
    <List searchBarPlaceholder="Search activities">
      {activities.map((activity) => (
        <List.Item
          key={activity.name}
          title={activity.name}
          icon={{
            source: sportIcons[activity.sport_type] ?? sportIcons["Workout"],
            tintColor: Color.PrimaryText,
          }}
          accessories={[
            { text: formatDuration(activity.moving_time), icon: Icon.Clock, tooltip: "Moving Time" },
            { text: formatDistance(activity.distance), icon: Icon.ArrowRight, tooltip: "Distance" },
            { text: `${activity.total_elevation_gain}m`, icon: Icon.ArrowUp, tooltip: "Elevation Gain" },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Activity Name" content={activity.name} />
            </ActionPanel>
          }
          keywords={[activity.name]}
        />
      ))}
    </List>
  );
}

export default withAccessToken(provider)(withClubs(Leaderboard));
