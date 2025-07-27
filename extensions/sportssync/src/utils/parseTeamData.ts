interface Team {
  team: {
    displayName: string;
    id: string;
  };
}

interface League {
  teams: Team[];
}

interface Sport {
  leagues: League[];
}

interface ResponseData {
  sports?: Sport[];
}

const sport = "";
const league = "";

fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams`)
  .then((response) => response.json())
  .then((data: ResponseData) => {
    const teams = data.sports?.[0]?.leagues[0].teams;
    const teamInfo = teams?.map((team) => {
      return {
        title: team.team.displayName,
        value: team.team.id,
      };
    });

    console.log(teamInfo);
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });

// F1 Constructors

// fetch(`https://site.api.espn.com/apis/v2/sports/racing/f1/standings`)
//   .then((response) => response.json())
//   .then((data) => {
//     const teams = data.children?.[1]?.standings?.entries;
//     const teamInfo = teams.map((team) => {
//       return {
//         title: team.team.displayName,
//         value: team.team.id,
//       };
//     });

//     console.log(teamInfo);
//   })
//   .catch((error) => {
//     console.error("Error fetching data:", error);
//   });
