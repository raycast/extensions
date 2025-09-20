import { formatSelectFields } from "@src/utils";
import useSportMonksClient from "./useSportMonksClient";
import { subDays, format, addDays } from "date-fns";
import { Fixture, Result, Location, HookResponse } from "@src/types";

type SelectFields = {
  result_info: boolean;
  starting_at: boolean;
};

type SportMonksLeagueField = {
  id: string;
  name: string;
  image_path: string;
};

type SportMonksParticipantField = {
  id: string;
  name: string;
  image_path: string;
  meta: {
    location: Location;
  };
};

type SportMonksScoreField = {
  score: {
    goals: number;
    participant: "home" | "away";
  };
  description: string;
};

type SportMonksTVStationField = {
  tvstation: {
    name: string;
    url: string;
  };
};

type SportMonksVenueField = {
  name: string;
};

type SportMonksFixturesByRange = {
  id: string;
  name: string;
  result_info: string;
  starting_at: string;
  league: SportMonksLeagueField;
  participants: SportMonksParticipantField[];
  scores: SportMonksScoreField[];
  tvstations: SportMonksTVStationField[];
  venue: SportMonksVenueField;
};

const computeScore =
  (participant: string) =>
  (goals: number, { score, description }: SportMonksScoreField) => {
    if (score.participant === participant && description === "CURRENT") {
      return goals + score.goals;
    }
    return goals;
  };

const useFetchFixtures = (teamId: string, selectFields: SelectFields) => {
  const selectedFields = formatSelectFields(selectFields);
  const startDate = format(subDays(new Date(), 30), "y-MM-ii");
  const endDate = format(addDays(new Date(), 30), "y-MM-ii");
  const { data, isLoading, revalidate } = useSportMonksClient({
    method: "get",
    path: `/fixtures/between/${startDate}/${endDate}/${teamId}?include=league;venue;participants;tvStations.tvStation;scores&select=name,${selectedFields}`,
  });
  const hookResponse: HookResponse<Fixture, typeof revalidate> = {
    data: [],
    isLoading,
    error: null,
    revalidate,
  };

  if (data?.status === 401) {
    return { ...hookResponse, error: "Invalid API Token" };
  }

  const response: SportMonksFixturesByRange[] = data?.data;
  const fixtures: Fixture[] = response
    ?.map(({ league, participants, scores, tvstations, ...fixtureData }) => {
      const [host, away] = participants;
      return {
        id: fixtureData.id,
        name: fixtureData.name,
        starting_at: new Date(fixtureData.starting_at),
        league: {
          id: league.id,
          name: league.name,
          image_path: league.image_path,
        },
        venue: fixtureData.venue.name,
        participants: {
          host: {
            name: host.name,
            image_path: host.image_path,
          },
          away: {
            name: away.name,
            image_path: away.image_path,
          },
        },
        result: fixtureData?.result_info?.includes("won")
          ? Result.Win
          : fixtureData?.result_info?.includes("draw")
          ? Result.Draw
          : fixtureData?.result_info?.includes("loss")
          ? Result.Loss
          : undefined,
        location: participants.find((p) => p.id === teamId)?.meta
          .location as Location,
        score: {
          host_goals:
            scores.length > 0 ? scores.reduce(computeScore("home"), 0) : null,
          away_goals:
            scores.length > 0 ? scores.reduce(computeScore("away"), 0) : null,
        },
        tvstations: tvstations.map(({ tvstation }) => ({
          name: tvstation.name,
          url: tvstation.url,
        })),
      };
    })
    .reverse();
  return { ...hookResponse, data: fixtures };
};

export default useFetchFixtures;
