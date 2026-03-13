interface IPlayerData {
  club: {
    tag: string;
    name: string;
  };
  "3vs3Victories": number;
  isQualifiedFromChampionshipChallenge: boolean;
  icon: {
    id: number;
  };

  name: string;
  tag: string;
  trophies: number;
  expLevel: number;
  expPoints: number;
  highestTrophies: number;
  powerPlayPoints: number;
  highestPowerPlayPoints: number;
  soloVictories: number;
  duoVictories: number;
  bestRoboRumbleTime: number;
  bestTimeAsBigBrawler: number;
  brawlers: [
    {
      id: number;
      rank: number;
      trophies: number;
      highestTrophies: number;
      power: number;
      name: string;

      // TODO : add starPowers and gadgets
      // "starPowers": [
      //     {
      //         "id": number;
      //         "name": string;
      //         "power": number;
      //         "rank": number;
      //         "trophies": number;
      //         "highestTrophies": number;
      //     }
      // ];
    }
  ];
  nameColor: string;
}

export const emptyPlayerData: IPlayerData = {
  name: "",
  nameColor: "",
  club: {
    tag: "",
    name: "",
  },
  "3vs3Victories": 0,
  isQualifiedFromChampionshipChallenge: false,
  icon: {
    id: 0,
  },
  tag: "",
  trophies: 0,
  expLevel: 0,
  expPoints: 0,
  highestTrophies: 0,
  powerPlayPoints: 0,
  highestPowerPlayPoints: 0,
  soloVictories: 0,
  duoVictories: 0,
  bestRoboRumbleTime: 0,
  bestTimeAsBigBrawler: 0,
  brawlers: [
    {
      id: 0,
      rank: 0,
      trophies: 0,
      highestTrophies: 0,
      power: 0,
      name: "",
    },
  ],
};
export type { IPlayerData };
