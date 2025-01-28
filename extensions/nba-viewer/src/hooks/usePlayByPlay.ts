import { useCachedPromise } from "@raycast/utils";
import getPlayByPlay from "../utils/getPlayByPlay";

type Order = "asc" | "desc";

export type Play = {
  id: string;
  sequence: number;
  text: string;

  type: {
    id: number;
    text: string;
    special: {
      isShooting: boolean;
      isScoring: boolean;
    };
  };

  period: {
    number: number;
    text: string;
  };
  clock: {
    value: string;
    timestamp: Date;
  };

  score: {
    value: number;
    current: {
      home: number;
      away: number;
    };
  };

  team?: {
    id: string;
  };
  participants?: {
    athlete: {
      id: string;
    };
  }[];
};

export type PlaysByPeriod = Record<
  number,
  {
    period: Play["period"];
    plays: Play[];
  }
>;

function padClockTime(time: string) {
  return time
    .split(":")
    .map((t) => t.padStart(2, "0"))
    .join(":");
}

const fetchPlayByPlay = async (league: string, gameId: string, order: Order = "desc") => {
  const playByPlayData = await getPlayByPlay({ league, gameId });

  let formattedPlays = playByPlayData.map((play) => ({
    id: play.id,
    sequence: Number(play.sequenceNumber),
    text: play.text,

    type: {
      id: Number(play.type.id),
      text: play.type.text,
      special: {
        isShooting: play.shootingPlay,
        isScoring: play.scoringPlay,
      },
    },

    period: {
      number: play.period.number,
      text: play.period.displayValue,
    },
    clock: {
      value: padClockTime(play.clock.displayValue),
      timestamp: new Date(play.wallclock),
    },

    score: {
      value: play.scoreValue,
      current: {
        home: play.homeScore,
        away: play.awayScore,
      },
    },

    team: play.team
      ? {
          id: play.team.id,
        }
      : undefined,

    participants: play.participants?.map((participant) => ({
      athlete: {
        id: participant.athlete.id,
      },
    })),
  }));

  if (order === "asc") {
    formattedPlays = formattedPlays.reverse();
  }

  return formattedPlays.reduce((accumulator, play) => {
    if (!accumulator[play.period.number]) {
      accumulator[play.period.number] = {
        period: play.period,
        plays: [],
      };
    }

    accumulator[play.period.number].plays.push(play);

    return accumulator;
  }, {} as PlaysByPeriod);
};

const usePlayByPlay = (league: string, gameId: string, order: Order = "desc") =>
  useCachedPromise(fetchPlayByPlay, [league, gameId, order], {
    failureToastOptions: { title: "Could not fetch play-by-play" },
  });

export default usePlayByPlay;
