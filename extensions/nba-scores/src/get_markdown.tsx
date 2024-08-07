export function formatMarkdown(data: any) {
    let teamsArray = data.shortName.split(' @ ')
    let awayTeamImage = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/scoreboard/${teamsArray[0]}.png&amp;scale=crop&amp;cquality=500&amp;location=origin&amp;w=250&amp;h=250`
    let homeTeamImage = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/scoreboard/${teamsArray[1]}.png&amp;scale=crop&amp;cquality=500&amp;location=origin&amp;w=250&amp;h=250`
    // let link = `https://s.espncdn.com/stitcher/sports/basketball/nba/events/${data.id}.png?templateId=espn.all.awayhome.5x2.1`
    let md = `![Away Team](${awayTeamImage})![Home Team](${homeTeamImage})`
    return md as string;
}

