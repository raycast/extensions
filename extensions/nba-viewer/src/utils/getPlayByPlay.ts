import axios from "axios";

export type GetPlayByPlayArgs = {
  league: string;
  gameId: string;
};

export type RawPlayResponse = {
  shootingPlay: boolean;
  sequenceNumber: string;
  period: {
    displayValue: string;
    number: number;
  };
  homeScore: number;
  scoringPlay: boolean;
  clock: {
    displayValue: string;
  };
  wallclock: string;
  team: {
    id: string;
  };
  type: {
    id: string;
    text: string;
  };
  awayScore: number;
  id: string;
  text: string;
  scoreValue: number;
  participants?: {
    athlete: {
      id: string;
    };
  }[];
};

export type RawPlayByPlayResponse = {
  gameId: number;
  gamepackageJSON: {
    plays: RawPlayResponse[];
  };
};

const getPlayByPlay = async ({ league, gameId }: GetPlayByPlayArgs) => {
  const baseUrl = `http://cdn.espn.com/core/${league}/playbyplay`;

  const params = {
    gameId,
    xhr: 1,
    render: false,
    device: "desktop",
    userab: 18,
  };

  const response = await axios.get<RawPlayByPlayResponse>(baseUrl, { params });
  return response.data.gamepackageJSON.plays;
};

export default getPlayByPlay;
