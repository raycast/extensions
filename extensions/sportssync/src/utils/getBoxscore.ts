import { PlayByPlayData } from "./getPlaybyPlay";

export function getBoxscore(playByPlayData: PlayByPlayData | undefined) {
  if (!playByPlayData) {
    return { teams: [], players: [] };
  }
  const { boxscore } = playByPlayData;
  return boxscore;
}

export function getBasketballBoxScore(playByPlayData: PlayByPlayData | undefined) {
  if (!playByPlayData) {
    return {
      homeTeam: {
        id: "",
        name: "",
        fieldGoalAttempted: "0",
        fieldGoalPct: "0",
        threePointAttempted: "0",
        threePointPct: "0",
        freeThrowAttempted: "0",
        freeThrowPct: "0",
        turnovers: "0",
      },
      awayTeam: {
        id: "",
        name: "",
        fieldGoalAttempted: "0",
        fieldGoalPct: "0",
        threePointAttempted: "0",
        threePointPct: "0",
        freeThrowAttempted: "0",
        freeThrowPct: "0",
        turnovers: "0",
      },
      homeLeaders: {
        leadingScorer: { id: "", name: "", value: "" },
        leadingAssists: { id: "", name: "", value: "" },
        leadingRebounder: { id: "", name: "", value: "" },
      },
      awayLeaders: {
        leadingScorer: { id: "", name: "", value: "" },
        leadingAssists: { id: "", name: "", value: "" },
        leadingRebounder: { id: "", name: "", value: "" },
      },
    };
  }

  const homeTeam = {
    id: playByPlayData?.boxscore?.teams?.[1]?.team?.id || "",
    name: playByPlayData?.boxscore?.teams?.[1]?.team?.displayName || "",
    fieldGoalAttempted: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[0]?.displayValue || "0",
    fieldGoalPct: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[1]?.displayValue || "0",
    threePointAttempted: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[2]?.displayValue || "0",
    threePointPct: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[3]?.displayValue || "0",
    freeThrowAttempted: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[4]?.displayValue || "0",
    freeThrowPct: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[5]?.displayValue || "0",
    turnovers: playByPlayData?.boxscore?.teams?.[1]?.statistics?.[12]?.displayValue || "0",
  };
  const awayTeam = {
    id: playByPlayData?.boxscore?.teams?.[0]?.team?.id || "",
    name: playByPlayData?.boxscore?.teams?.[0]?.team?.displayName || "",
    fieldGoalAttempted: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[0]?.displayValue || "0",
    fieldGoalPct: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[1]?.displayValue || "0",
    threePointAttempted: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[2]?.displayValue || "0",
    threePointPct: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[3]?.displayValue || "0",
    freeThrowAttempted: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[4]?.displayValue || "0",
    freeThrowPct: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[5]?.displayValue || "0",
    turnovers: playByPlayData?.boxscore?.teams?.[0]?.statistics?.[12]?.displayValue || "0",
  };

  const homeLeaders = {
    leadingScorer: {
      id: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.athlete?.id || "",
      name: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.athlete?.shortName || "",
      value: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.displayValue || "",
    },
    leadingAssists: {
      id: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.athlete?.id || "",
      name: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.athlete?.shortName || "",
      value: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.displayValue || "",
    },
    leadingRebounder: {
      id: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.athlete?.id || "",
      name: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.athlete?.shortName || "",
      value: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.displayValue || "",
    },
  };

  const awayLeaders = {
    leadingScorer: {
      id: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.athlete?.id || "",
      name: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.athlete?.shortName || "",
      value: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.displayValue || "",
    },
    leadingAssists: {
      id: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.athlete?.id || "",
      name: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.athlete?.shortName || "",
      value: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.displayValue || "",
    },
    leadingRebounder: {
      id: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.athlete?.id || "",
      name: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.athlete?.shortName || "",
      value: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.displayValue || "",
    },
  };

  return { homeTeam, awayTeam, homeLeaders, awayLeaders };
}

export function getFootballBoxScore(playByPlayData: PlayByPlayData | undefined) {
  if (!playByPlayData) {
    return {
      homeTeam: {
        id: "",
        name: "",
        totalYards: "0",
        turnovers: "0",
        penalties: "0",
        thirdDowns: "0",
        timeOfPossession: "0:00",
      },
      awayTeam: {
        id: "",
        name: "",
        totalYards: "0",
        turnovers: "0",
        penalties: "0",
        thirdDowns: "0",
        timeOfPossession: "0:00",
      },
      homePlayers: {
        qb: { id: "", shortName: "", displayValue: "", headshot: "" },
        wr: { id: "", shortName: "", displayValue: "", headshot: "" },
        rb: { id: "", shortName: "", displayValue: "", headshot: "" },
      },
      awayPlayers: {
        qb: { id: "", shortName: "", displayValue: "", headshot: "" },
        wr: { id: "", shortName: "", displayValue: "", headshot: "" },
        rb: { id: "", shortName: "", displayValue: "", headshot: "" },
      },
    };
  }

  const homeTeam = {
    id: playByPlayData?.boxscore?.teams?.[1].team.id || "",
    name: playByPlayData?.boxscore?.teams?.[1].team.displayName || "",
    totalYards: playByPlayData?.boxscore?.teams?.[1].statistics?.[7].displayValue || "",
    turnovers: playByPlayData?.boxscore?.teams?.[1].statistics?.[20].displayValue || "",
    penalties: playByPlayData?.boxscore?.teams?.[1].statistics?.[19].displayValue || "",
    thirdDowns: playByPlayData?.boxscore?.teams?.[1].statistics?.[4].displayValue || "",
    timeOfPossession: playByPlayData?.boxscore?.teams?.[1].statistics?.[24].displayValue || "0:00",
  };

  const awayTeam = {
    id: playByPlayData?.boxscore?.teams?.[0].team.id || "",
    name: playByPlayData?.boxscore?.teams?.[0].team.displayName || "",
    totalYards: playByPlayData?.boxscore?.teams?.[0].statistics?.[7].displayValue || "",
    turnovers: playByPlayData?.boxscore?.teams?.[0].statistics?.[20].displayValue || "",
    penalties: playByPlayData?.boxscore?.teams?.[0].statistics?.[19].displayValue || "",
    thirdDowns: playByPlayData?.boxscore?.teams?.[0].statistics?.[4].displayValue || "",
    timeOfPossession: playByPlayData?.boxscore?.teams?.[0].statistics?.[24].displayValue || "0:00",
  };

  const homePlayers = {
    qb: {
      id: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.athlete?.id || "",
      shortName: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.athlete?.shortName || "",
      headshot: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.athlete?.headshot?.href || "",
      displayValue: playByPlayData?.leaders?.[0]?.leaders?.[0]?.leaders?.[0]?.displayValue || "",
    },
    rb: {
      id: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.athlete?.id || "",
      shortName: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.athlete?.shortName || "",
      headshot: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.athlete?.headshot?.href || "",
      displayValue: playByPlayData?.leaders?.[0]?.leaders?.[1]?.leaders?.[0]?.displayValue || "",
    },
    wr: {
      id: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.athlete?.id || "",
      shortName: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.athlete?.shortName || "",
      headshot: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.athlete?.headshot?.href || "",
      displayValue: playByPlayData?.leaders?.[0]?.leaders?.[2]?.leaders?.[0]?.displayValue || "",
    },
  };

  const awayPlayers = {
    qb: {
      id: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.athlete?.id || "",
      shortName: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.athlete?.shortName || "",
      headshot: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.athlete?.headshot?.href || "",
      displayValue: playByPlayData?.leaders?.[1]?.leaders?.[0]?.leaders?.[0]?.displayValue || "",
    },
    rb: {
      id: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.athlete?.id || "",
      shortName: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.athlete?.shortName || "",
      headshot: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.athlete?.headshot?.href || "",
      displayValue: playByPlayData?.leaders?.[1]?.leaders?.[1]?.leaders?.[0]?.displayValue || "",
    },
    wr: {
      id: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.athlete?.id || "",
      shortName: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.athlete?.shortName || "",
      headshot: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.athlete?.headshot?.href || "",
      displayValue: playByPlayData?.leaders?.[1]?.leaders?.[2]?.leaders?.[0]?.displayValue || "",
    },
  };

  return { homeTeam, awayTeam, homePlayers, awayPlayers };
}

export function getHockeyBoxScore(playByPlayData: PlayByPlayData | undefined) {
  if (!playByPlayData) {
    return {
      homeTeam: {
        id: "",
        name: "",
        hits: "0",
        shots: "0",
        takeaways: "0",
        powerPlayPct: "0",
        faceOffPct: "0",
        penalties: "0",
      },
      awayTeam: {
        id: "",
        name: "",
        hits: "0",
        shots: "0",
        takeaways: "0",
        powerPlayPct: "0",
        faceOffPct: "0",
        penalties: "0",
      },
      homeLeaders: {
        leadingGoals: { id: "", shortName: "", displayValue: "" },
        leadingAssists: { id: "", shortName: "", displayValue: "" },
        leadingPoints: { id: "", shortName: "", displayValue: "" },
      },
      awayLeaders: {
        leadingGoals: { id: "", shortName: "", displayValue: "" },
        leadingAssists: { id: "", shortName: "", displayValue: "" },
        leadingPoints: { id: "", shortName: "", displayValue: "" },
      },
    };
  }

  const homeTeam = {
    id: playByPlayData?.boxscore?.teams?.[1].team.id || "",
    name: playByPlayData?.boxscore?.teams?.[1].team.displayName || "",
    hits: playByPlayData?.boxscore?.teams?.[1].statistics?.[1].displayValue || "0",
    shots: playByPlayData?.boxscore?.teams?.[1].statistics?.[3].displayValue || "0",
    takeaways: playByPlayData?.boxscore?.teams?.[1].statistics?.[2].displayValue || "0",
    powerPlayPct: playByPlayData?.boxscore?.teams?.[1].statistics?.[6].displayValue || "0",
    faceOffPct: playByPlayData?.boxscore?.teams?.[1].statistics?.[10].displayValue || "0",
    penalties: playByPlayData?.boxscore?.teams?.[1].statistics?.[12].displayValue || "0",
  };
  const awayTeam = {
    id: playByPlayData?.boxscore?.teams?.[0].team.id || "",
    name: playByPlayData?.boxscore?.teams?.[0].team.displayName || "",
    hits: playByPlayData?.boxscore?.teams?.[0].statistics?.[1].displayValue || "0",
    shots: playByPlayData?.boxscore?.teams?.[0].statistics?.[3].displayValue || "0",
    takeaways: playByPlayData?.boxscore?.teams?.[0].statistics?.[2].displayValue || "0",
    powerPlayPct: playByPlayData?.boxscore?.teams?.[0].statistics?.[6].displayValue || "0",
    faceOffPct: playByPlayData?.boxscore?.teams?.[0].statistics?.[10].displayValue || "0",
    penalties: playByPlayData?.boxscore?.teams?.[0].statistics?.[12].displayValue || "0",
  };
  const homeLeaders = {
    leadingGoals: {
      id: playByPlayData?.leaders?.[0].team.id,
      shortName: playByPlayData?.leaders?.[0].leaders?.[0].leaders?.[0]?.athlete?.shortName || "",
      displayValue: playByPlayData?.leaders?.[0].leaders?.[0].leaders?.[0]?.displayValue || "",
    },
    leadingAssists: {
      id: playByPlayData?.leaders?.[0].team.id,
      shortName: playByPlayData?.leaders?.[0].leaders?.[1].leaders?.[0]?.athlete?.shortName || "",
      displayValue: playByPlayData?.leaders?.[0].leaders?.[1].leaders?.[0]?.displayValue || "",
    },
    leadingPoints: {
      id: playByPlayData?.leaders?.[0].team.id,
      shortName: playByPlayData?.leaders?.[0].leaders?.[2].leaders?.[0]?.athlete?.shortName || "",
      displayValue: playByPlayData?.leaders?.[0].leaders?.[2].leaders?.[0]?.displayValue || "",
    },
  };
  const awayLeaders = {
    leadingGoals: {
      id: playByPlayData?.leaders?.[1].team.id,
      shortName: playByPlayData?.leaders?.[1].leaders?.[0].leaders?.[0]?.athlete?.shortName || "",
      displayValue: playByPlayData?.leaders?.[1].leaders?.[0].leaders?.[0]?.displayValue || "",
    },
    leadingAssists: {
      id: playByPlayData?.leaders?.[1].team.id,
      shortName: playByPlayData?.leaders?.[1].leaders?.[1].leaders?.[0]?.athlete?.shortName || "",
      displayValue: playByPlayData?.leaders?.[1].leaders?.[1].leaders?.[0]?.displayValue || "",
    },
    leadingPoints: {
      id: playByPlayData?.leaders?.[1].team.id,
      shortName: playByPlayData?.leaders?.[1].leaders?.[2].leaders?.[0]?.athlete?.shortName || "",
      displayValue: playByPlayData?.leaders?.[1].leaders?.[2].leaders?.[0]?.displayValue || "",
    },
  };

  return { homeTeam, awayTeam, homeLeaders, awayLeaders };
}
