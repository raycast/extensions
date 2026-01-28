# Fotmob

Unofficial [Fotmob](https://www.fotmob.com/) extension for [Raycast](https://raycast.com/) that brings football data directly to your command bar.

![Fotmob extension for Raycast](./metadata/fotmob-1.png)

## Overview

Stay updated with the football world without leaving your workflow. This Raycast extension provides quick access to live scores, match schedules, league tables, team information, and player data from Fotmob's comprehensive football database.

### What You Can Do

- 🏆 **Match Day**: View live scores and match schedules
- ❤️ **Favorites**: Manage and quickly access your favorite teams, players, and leagues
- 🔍 **Search**: Find teams and players with dedicated search commands
- 📊 **League Tables**: Check standings and league information
- 👤 **Player Details**: View player information and statistics
- 🏟️ **Team Details**: Get comprehensive team information, squad details, and recent form
- ⚽ **Match Details**: Detailed match information and statistics

## Installation

1. Open Raycast
2. Search for "Store" or press `⌘ + ,` to open preferences
3. Go to the Extensions tab
4. Search for "Fotmob"
5. Click Install

## Commands

### 🏆 Match Day
View today's match schedule and live scores with real-time updates.

### ❤️ Favorite
Quickly access all your favorite teams, players, and leagues in one place.

### 🔍 Search Teams
Find any football team by name with instant results and team actions.

### 👤 Search Players
Search for football players by name and access their profiles.

### 🏟️ Team Detail
Get comprehensive team information by entering a team ID.

### 👤 Player Detail
View player information by entering a player ID.

### 📊 League Table
Check league standings and table information by league ID.

### ⚽ Match Detail
Get detailed match information and statistics by match ID.

### 🎯 Favorite Upcoming Matches
View all upcoming matches for your favorite teams.

### 🏆 Favorite League Tables
Quick access to league tables for your favorite competitions.

## Screenshots

![Match Day View](./metadata/fotmob-2.png)
*Match Day - View live scores and match schedules*

![Team Search](./metadata/fotmob-3.png)
*Search Teams - Find any football team instantly*

![Team Details](./metadata/fotmob-4.png)
*Team Detail - Comprehensive team information*

![Player Search](./metadata/fotmob-5.png)
*Player Search - Find players with team context*

![League Table](./metadata/fotmob-6.png)
*League Table - Current standings and statistics*

![Favorites](./metadata/fotmob-7.png)
*Favorites - Quick access to your saved items*

## Detailed Features

### Search Teams

The new "Search Teams" command provides a focused way to find football teams by name:

### Features
- **Fast Team Search**: Start typing any team name to get instant results
- **Team-Specific Results**: Shows only teams, no matches/players/leagues
- **Quick Actions**:
  - View team details directly
  - Add/remove from favorites
  - Open in browser
  - Copy team ID
- **Visual Indicators**: See team logos and favorite status at a glance

### How to Use
1. Open Raycast and type "Search Teams" or use the command
2. Start typing the name of any football team
3. Browse results and select the team you want
4. Use ⌘+Enter to view team details, or choose other actions

### Available Actions
- **Show Team Details**: View comprehensive team information
- **Add/Remove Favorites**: Quick favorite management with feedback
- **Open in Browser**: View team page on Fotmob website
- **Copy Team ID**: Copy the team's unique identifier

## Search Players

**Note:** Due to Fotmob API limitations, player details show basic information with links to complete profiles.

The new "Search Players" command provides a focused way to find football players by name:

### Features
- **Fast Player Search**: Start typing any player name to get instant results
- **Player-Specific Results**: Shows only players, no teams/matches/leagues
- **Team Context**: Shows which team each player currently plays for
- **Quick Actions**:
  - View player details directly
  - Add/remove from favorites
  - Open in browser
  - Copy player ID
- **Visual Indicators**: See player photos and favorite status at a glance

### How to Use
1. Open Raycast and type "Search Players" or use the command
2. Start typing the name of any football player
3. Browse results and select the player you want
4. Use ⌘+Enter to view player details, or choose other actions

### Available Actions
- **Show Player Details**: View comprehensive player information
- **Add/Remove Favorites**: Quick favorite management with feedback
- **Open in Browser**: View player page on Fotmob website
- **Copy Player ID**: Copy the player's unique identifier

## Player Detail View

The player detail view provides basic information about football players with links to comprehensive data:

### Player Overview
- **Basic Information**: Player name, ID, and position
- **Current Team**: Team affiliation with direct team access
- **Player Photo**: Official player image from Fotmob

### Available Data
- **Essential Info**: Core player details available through search
- **Team Context**: Current team information with navigation links
- **Browser Integration**: Direct access to complete player profiles on Fotmob
- **Clear Guidance**: Transparent communication about data limitations

### What's Available vs. What's Not
✅ **Available:**
- Player name and basic identification
- Current team information
- Player photos
- Direct links to Fotmob player pages
- Favorites management
- Team navigation

❌ **Not Available (API Limitations):**
- Detailed career statistics
- Match-by-match performance data
- Transfer history and market values
- Comprehensive biographical information

### Navigation & Actions
- **Team Integration**: Direct access to current team details
- **Favorite Management**: Add/remove from player favorites
- **External Links**: Open player profiles on Fotmob website
- **Data Export**: Copy player ID for external use

### Player Detail Access
You can access player details in multiple ways:

1. **From Player Detail Command**: Use the "Player Detail" command and enter a player ID
2. **From Search Players**: Use the dedicated player search command
3. **From General Search**: Search for players in the main search (Favorite command)
4. **From Favorite Players**: Access saved favorite players directly
5. **From Team Details**: View player information from team squad lists

## Enhanced Favorites

The favorites system now fully supports players:

### Player Favorites
- **Quick Access**: All favorite players displayed with photos
- **Player Actions**: Direct access to player details and management
- **Team Context**: See which team each favorite player plays for
- **Easy Management**: Add/remove players from any search or detail view

### Favorite Integration
- **Search Integration**: Add players to favorites directly from search results
- **Detail Integration**: Manage favorites from player detail views
- **Visual Feedback**: Toast notifications for all favorite operations
- **Persistent Storage**: Favorites saved across app sessions

## Player API Limitations & Current Implementation

**Important Note:** Fotmob does not provide a public API endpoint for detailed player data. The current player functionality works with the following approach:

### Current Player Features
- **Basic Player Information**: Player name, ID, position, and current team
- **Player Photos**: Official player images from Fotmob's CDN
- **Team Integration**: Direct links to player's current team details
- **Favorites Management**: Full support for adding/removing player favorites
- **Browser Integration**: Direct links to complete player profiles on Fotmob website

### Data Source & Limitations
- **Search-Based Data**: Player information is gathered from search API results
- **Limited Statistics**: No access to detailed career stats, match history, or performance metrics
- **Basic Profile**: Shows essential information but directs users to Fotmob website for comprehensive data
- **Graceful Fallback**: Provides useful functionality while acknowledging data limitations

### Why This Approach?
After extensive testing, Fotmob's player detail endpoints are either:
- Not publicly accessible (return 404 errors)
- Require special authentication not available to third-party apps
- Reserved for their official mobile and web applications

### User Experience
The implementation prioritizes user experience by:
- **Transparent Communication**: Clearly explaining data limitations to users
- **Useful Actions**: Providing quick access to official Fotmob player pages
- **Seamless Integration**: Maintaining consistency with team and other features
- **Favorites Support**: Full player favorites functionality for organization

## Implementation Summary

This update adds comprehensive player functionality to the Fotmob extension:

### New Commands Added
- **`player`** - View detailed player information by ID
- **`search-players`** - Search for players by name with focused results

### New Components Created
- **`PlayerView`** - Comprehensive player detail display with stats, career history, and actions
- **`PlayerSearchView`** - Dedicated player search interface with team context
- **`usePlayerDetail`** - Hook for fetching detailed player data from Fotmob API
- **`usePlayerSearch`** - Hook for player-specific search functionality
- **`launchPlayerCommand`** - Utility for navigating to player details

### Enhanced Features
- **Player Types** - Complete TypeScript definitions for player data structures
- **Search Integration** - Players now have full action support in general search
- **Favorites Enhancement** - Players can be added/removed from favorites with visual feedback
- **Navigation** - Seamless navigation between players, teams, and other entities

### API Integration
- **Search API** - Used to gather basic player information from search results
- **Player Images** - Direct access to Fotmob's player image CDN
- **Fallback Strategy** - Graceful handling when detailed player APIs are unavailable
- **Error Handling** - Clear user guidance when player data cannot be found

**Note:** Direct player detail APIs are not publicly available, so the implementation uses search data and provides browser links for complete information.

All new functionality follows existing code patterns and maintains consistency with the current extension architecture.

## Technical Information

### Data Source
This extension uses the unofficial Fotmob API to fetch football data. Some player detail endpoints may have limitations due to API restrictions.

### Requirements
- Raycast 1.50.0 or later
- Internet connection for live data

### Contributing
This extension is open source. Feel free to contribute improvements or report issues.

### Disclaimer
This is an unofficial extension and is not affiliated with Fotmob. All football data is provided by Fotmob's services.

---

## Advanced Features

### Team Detail View

The team detail view provides comprehensive information about any football team:

### Team Overview
- **Basic Information**: Team name, country, current season
- **Stadium Details**: Home venue with capacity and location
- **League Position**: Current standing in primary league
- **Recent Form**: Visual representation of last 5 matches (🟢 Win, 🟡 Draw, 🔴 Loss)
- **Next Match**: Upcoming fixture with countdown

### League Standing
- Current position in league table
- Points, matches played, wins/draws/losses
- Goals scored/conceded and goal difference
- Visual indicators for European qualification spots

### Top Players
- Leading goalscorers and assist providers
- Player ratings and nationality
- Injury status indicators

### Match History
- **Live Matches**: Currently ongoing games
- **Upcoming Fixtures**: Next 8 scheduled matches
- **Recent Results**: Last 8 completed matches
- Direct links to detailed match information

### Squad Information
- Player roster with positions and shirt numbers
- Age and nationality of players
- Current injury and suspension status

### Transfer Activity
- Recent incoming transfers with fees and dates
- Outgoing transfers and loan deals
- Transfer window information

### Team Colors & Branding
- Official team colors (primary, secondary, text)
- Team logos and visual identity

### Team Detail Actions
You can access team details in multiple ways:

1. **From Team Detail Command**: Use the "Team Detail" command and enter a team ID
2. **From Match Day**: View any match and use keyboard shortcuts:
   - `⌘ + Shift + H` to view home team details
   - `⌘ + Shift + A` to view away team details
3. **From Match Details**: Click on any team name to view their comprehensive details
4. **From Favorite Matches**: All match items include team detail actions

### Navigation
- Team IDs can be found through search or favorite team listings
- All match views now include direct access to team information
- Seamless navigation between matches and team details
