<div align="center">
<img src="./assets/soccer-field.png" width="175" alt="App Icon">

  <h1>Soccer Live</h1>
  <p>A Raycast Extension for Live Soccer Matches</p>

</div>

<br>

Soccer Live is a Raycast extension for live soccer matches, standings, news, and schedules across major European leagues, European competitions, and international tournaments. It uses ESPN’s public data (no API key required). You get real-time scores, match statistics with formations and lineups, league tables, news, and a favorite-teams dashboard—all from Raycast.

## Features

### Core Features

- **Live Match Tracking**: Automatically fetches all currently running matches across multiple leagues
- **Scores and Schedule**: View all games (scheduled, live, and completed) grouped by date with league filtering
- **League Standings**: View current league tables with team positions, points, goals, and records
- **News Articles**: Browse latest news articles from each league
- **Favorite Teams Dashboard**: Track multiple favorite teams with:
  - Upcoming games schedule
  - Recent completed games
  - Current standings position
  - Latest news articles
- **Multi-League Support**: 
  - **European Domestic Leagues**: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, and more
  - **European Competitions**: Champions League, Europa League, Europa Conference League, UEFA European Championship
  - **International Tournaments**: FIFA World Cup, AFCON, Copa América, CONCACAF Gold Cup, AFC Asian Cup, and more

### User Experience Features

- **League Dropdown**: Select a league from dropdown menus to filter content by league
- **Search Functionality**: Search for matches, teams, or articles by name, abbreviation, or league
- **Organized Display**: View content grouped by league or date for easy navigation
- **Multiple Favorite Teams**: Add and manage multiple favorite teams across different leagues
- **Match Statistics**: Open any match to view:
  - **Match Formations** – Text-based formation map (GK, Defense, Midfield, Attack) for both teams with starters; link to ESPN lineups for the visual field map
  - **Reserves** – Bench players and managers per team
  - **Match Statistics** – Team stats (possession, shots, passes, etc.) and player leaders
  - Quick actions to open the match or formation on ESPN
- **Persistent Selection**: Your selected leagues and favorite teams are saved and persist across sessions
- **Real-time Updates**: Scores and statistics update automatically
- **Menu Bar Integration**: View live scores directly from your menu bar

## Commands

The extension provides 6 main commands:

1. **Soccer Live Matches**: View live matches with league filtering and search
2. **Soccer Scores and Schedule**: View all games (scheduled, live, completed) grouped by date
3. **Soccer Standings**: View league tables and add teams to favorites
4. **Soccer News**: Browse latest news articles from each league
5. **Favorite Teams Dashboard**: Centralized view for all your favorite teams
6. **Soccer Live Menubar**: View live scores directly from your menu bar

## How It Works

### Viewing Live Matches

1. **Open "Soccer Live Matches"**: Launch the command from Raycast
2. **Select a League** (Optional): Use the dropdown menu to filter matches by league, or leave it unselected to view all live matches
3. **Search for Matches**: Use the search bar to find specific matches or teams by name, abbreviation, or league
4. **View Results**: All live matches are displayed with current scores, grouped by league
5. **View Statistics**: Press Enter or click on any match to see detailed statistics

### Viewing Scores and Schedule

1. **Open "Soccer Scores and Schedule"**: Launch the command from Raycast
2. **Select a League**: Choose a league from the dropdown to view all games
3. **Browse Games**: Games are grouped by date - see scheduled, live, and completed games
4. **Add Teams to Favorites**: Click on any game and use "Add to Favorites" to track teams
5. **View Statistics**: Click on live or completed games to view detailed match statistics

### Managing Favorite Teams

1. **Add Teams**: 
   - From "Soccer Standings": Click on any team and select "Add to Favorites"
   - From "Soccer Scores and Schedule": Click on any game and add either team
2. **View Favorite Teams**: Open "Favorite Teams Dashboard" to see:
   - **Upcoming Games**: All scheduled games for your favorite teams
   - **Recent Games**: Completed games with final scores
   - **Standings**: Current league position and statistics for each team
   - **News**: Latest articles from each team's league
3. **Remove Teams**: Use "Remove from Favorites" action from the dashboard or standings view

### Viewing Standings

1. **Open "Soccer Standings"**: Launch the command from Raycast
2. **Select a League**: Choose a league from the dropdown
3. **Browse Teams**: See current positions, points, goals for/against, and records
4. **Add to Favorites**: Click on any team to add it to your favorites
5. **Search**: Use the search bar to quickly find specific teams

### Reading News

1. **Open "Soccer News"**: Launch the command from Raycast
2. **Select a League**: Choose a league to filter articles
3. **Browse Articles**: View headlines with publication dates
4. **Read Articles**: Click to open articles on ESPN or copy article links

## Supported Leagues

### European Domestic Leagues
- English Premier League (ENG.1)
- La Liga (ESP.1)
- German Bundesliga (GER.1)
- Italian Serie A (ITA.1)
- French Ligue 1 (FRA.1)
- Dutch Eredivisie (NED.1)
- Portuguese Primeira Liga (POR.1)
- Belgian Pro League (BEL.1)
- Scottish Premiership (SCO.1)
- Turkish Süper Lig (TUR.1)
- Greek Super League (GRE.1)
- Austrian Bundesliga (AUT.1)
- Swiss Super League (SUI.1)

### European Competitions
- UEFA Champions League (uefa.champions)
- UEFA Europa League (uefa.europa)
- UEFA Europa Conference League (uefa.europa.conference)
- UEFA European Championship (uefa.euro)

### International Competitions
- FIFA World Cup (fifa.world)
- Africa Cup of Nations - AFCON (africa.cup)
- Copa América (copa.america)
- CONCACAF Gold Cup (concacaf.gold)
- AFC Asian Cup (afc.asian)
- FIFA Club World Cup (fifa.club)

## Requirements

- macOS
- Raycast application
- Internet connection

## Installation

1. Clone this repository
2. Open Raycast
3. Go to Extensions → Import Extension
4. Select this directory
5. All 6 commands will be available:
   - Soccer Live Matches
   - Soccer Scores and Schedule
   - Soccer Standings
   - Soccer News
   - Favorite Teams Dashboard
   - Soccer Live Menubar

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix lint and formatting
npm run fix-lint
```

## Publishing to the Raycast Store

To publish this extension to the [Raycast Store](https://raycast.com/store):

1. Ensure the project builds: `npm run build`
2. Run `npm run publish` and complete GitHub authentication when prompted
3. A pull request will be opened on the [Raycast extensions repository](https://github.com/raycast/extensions); after review and merge, the extension will appear in the Store

See [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store) and [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension) for full guidelines.

## License

This project is licensed under the MIT License.
