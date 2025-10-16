// {
//   "id": 4314998,
//   "pageUrl": "/match/4314998/matchfacts/manchester-united-vs-galatasaray",
//   "opponent": {
//     "id": 8637,
//     "name": "Galatasaray",
//     "score": 0
//   },
//   "home": {
//     "id": 10260,
//     "name": "Man United",
//     "score": 0
//   },
//   "away": {
//     "id": 8637,
//     "name": "Galatasaray",
//     "score": 0
//   },
//   "displayTournament": true,
//   "lnameArr": [
//     "H",
//     " | Champions League"
//   ],
//   "notStarted": true,
//   "tournament": {
//     "name": "Champions League",
//     "leagueId": 42
//   },
//   "status": {
//     "utcTime": "2023-10-03T19:00:00.000Z",
//     "started": false,
//     "cancelled": false,
//     "finished": false
//   }
// }
export type MatchFixture = {
  id: number;
  pageUrl: string;
  opponent: {
    id: number;
    name: string;
    score: number;
  };
  home: {
    id: number;
    name: string;
    score: number;
  };
  away: {
    id: number;
    name: string;
    score: number;
  };
  displayTournament: boolean;
  lnameArr: string[];
  notStarted: boolean;
  result: number | null;
  tournament: {
    name: string;
    leagueId: number;
  };
  status: {
    utcTime: string;
    started: boolean;
    cancelled: boolean;
    finished: boolean;
    ongoing: boolean | null;
    liveTime: {
      short: string;
      maxTime: number;
    } | null;
    reason: {
      short: string;
    } | null;
  };
};

export type AllFixtureData = {
  fixtures: MatchFixture[];
  nextMatch: MatchFixture | null;
};

export type FixtureData = {
  allFixtures: AllFixtureData;
};

export type TeamDetailData = {
  fixtures: FixtureData;
};
