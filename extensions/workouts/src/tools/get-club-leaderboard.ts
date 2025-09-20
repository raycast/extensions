import { withAccessToken } from "@raycast/utils";
import { getClubActivities, provider } from "../api/client";
import { getSportTypesFromActivityTypes, getStartOfWeekUnix } from "../utils";
import { AthleteActivities } from "../leaderboard";
import { StravaSummaryClub } from "../api/types";

export default withAccessToken(provider)(async ({
  club,
}: {
  /** The club to fetch the activities for. Do not ask user to specify club if there is only one in the list */
  club: StravaSummaryClub;
}) => {
  const startOfWeek = getStartOfWeekUnix();
  const activities = await getClubActivities(club.id.toString(), 1, 100, startOfWeek);

  if (!activities.length) {
    return [];
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

  return activitiesPerAthlete;
});
