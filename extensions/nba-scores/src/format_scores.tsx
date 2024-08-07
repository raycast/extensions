import moment from 'moment-timezone';
import axios from 'axios';

async function getNBAScores(): Promise<any> {
  const url = 'http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error retrieving NBA scores:', error);
    throw error;
  }
}


export async function getScoresArray() {
  const results = [];
  try {
    const data = await getNBAScores();
    const games = data["events"];
    

    for (let i = 0; i < games.length; i++) {
      const id = games[i].id
      const shortName = games[i].shortName;
      let boxScoreLink = games[i].links[0].href
      for (let comp of games[i].competitions) {
        const dateStr = comp.date
        const localTime = moment.utc(dateStr).local().format('h:mm A');
        const score1 = comp.competitors[0].score;
        const score2 = comp.competitors[1].score;
        const status = comp.status;
        let currentScore = `${score2} - ${score1} `
        let fullName = `${comp.competitors[1].team.name} @ ${comp.competitors[0].team.name}`
        let statusPretty;
        if (status.type.name == "STATUS_FINAL") {
          statusPretty = "[Final]";
        } else if(status.type.name == "STATUS_SCHEDULED") {
          statusPretty = `[${localTime}]`
          currentScore = ""
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
  } catch (error) {
    // Handle error
    throw error; // Reject the promise with the error
  }
}

export async function getNBAStandings() {
  const fetch = require('node-fetch');
  const cheerio = require('cheerio');
  
  fetch('https://www.basketball-reference.com')
    .then((response: any) => response.text())
    .then((html: string) => {
      const $ = cheerio.load(html);
  
      // Extract the Eastern Conference standings
      const eastStandingsRows = $('#confs_standings_E tbody tr');
  
      // Extract the Western Conference standings
      const westStandingsRows = $('#confs_standings_W tbody tr');
  
      // Now you can further process these rows to extract specific data such as team names, wins, and losses
      console.log(eastStandingsRows, westStandingsRows)
    })
    .catch((error: any) => console.error('An error occurred: ', error));
  
}

 

