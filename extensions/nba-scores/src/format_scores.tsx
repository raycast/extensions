import moment from "moment-timezone";
import axios from "axios";

interface NBAScoreboardResponse {
  events: NBAGame[];
}

interface NBAGame {
  id: string;
  shortName: string;
  links: {
    href: string;
  }[];
  competitions: {
    date: string;
    competitors: {
      score: number;
      team: {
        name: string;
      };
    }[];
    status: {
      type: {
        name: string;
      };
      period: string;
      displayClock: string;
    };
  }[];
}

async function getNBAScores(): Promise<NBAScoreboardResponse> {
  const url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
  const response = await axios.get(url);
  return response.data;
}

export async function getScoresArray() {
  const results = [];

  const data = await getNBAScores();

  const games = data["events"];

  for (let i = 0; i < games.length; i++) {
    const id = games[i].id;
    const shortName = games[i].shortName;
    const boxScoreLink = games[i].links[0].href;
    for (const comp of games[i].competitions) {
      const dateStr = comp.date;
      const localTime = moment.utc(dateStr).local().format("h:mm A");
      const score1 = comp.competitors[0].score;
      const score2 = comp.competitors[1].score;
      const status = comp.status;
      let currentScore = `${score2} - ${score1} `;
      const fullName = `${comp.competitors[1].team.name} @ ${comp.competitors[0].team.name}`;
      let statusPretty;
      if (status.type.name == "STATUS_FINAL") {
        statusPretty = "[Final]";
      } else if (status.type.name == "STATUS_SCHEDULED") {
        statusPretty = `[${localTime}]`;
        currentScore = "";
      } else {
        statusPretty = `[Q${status.period} - ${status.displayClock}]`;
      }

      const resultObj = {
        id: id,
        fullName: fullName,
        shortName: shortName,
        score: currentScore,
        link: boxScoreLink,
        status: statusPretty,
      };
      results.push(resultObj);
    }
  }

  return results; // Resolve the promise with the results arr cray
}
