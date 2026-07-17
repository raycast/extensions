# PSN - PlayStation Network Extension for Raycast

A Raycast extension that allows you to access your PlayStation Network profile, view recently played games, and track your trophy progress directly from Raycast.

## Features

- 🎮 **Recently Played Games**: View your recently played PlayStation games with game details
- 🏆 **Trophy Tracking**: Browse and search through your earned trophies
- 📊 **Game Details**: View detailed trophy information for each game
- 🔍 **Search Functionality**: Quickly find specific games or trophies

## Installation

1. Install the extension from the Raycast Store
2. Configure your NPSSO token in the extension preferences

## Setup

### Getting Your NPSSO Token

1. Open your web browser and go to [PlayStation.com](https://www.playstation.com)
2. In the same browser (due to a persisted cookie), visit https://ca.account.sony.com/api/v1/ssocookie.
3. Copy your NPSSO and paste it into the extension preferences.

## Commands

### Recently Played
- **Command**: `Recently Played`
- **Description**: View your recently played PlayStation games

### Recently Trophy
- **Command**: `Recently Trophy`
- **Description**: Browse your recently earned trophies

### Trophy
- **Command**: `Trophy`
- **Description**: Access detailed trophy information

## Usage

1. Open Raycast (⌘ + Space)
2. Type any of the PSN commands:
   - "Recently Played" - to see your recent games
   - "Recently Trophy" - to view recent trophies
   - "Trophy" - for detailed trophy information
3. Navigate through the results using arrow keys
4. Press Enter to view detailed information

## Requirements

- Raycast (latest version)
- Valid PlayStation Network account
- NPSSO authentication token

## Privacy & Security

- Your NPSSO token is stored securely in Raycast preferences
- No data is stored or transmitted to third parties
- All communication is directly with PlayStation Network APIs

## Troubleshooting

### Authentication Issues
- Ensure your NPSSO token is valid and not expired
- Try logging out and back into PlayStation.com to get a fresh token
- Check that your PlayStation account has the necessary privacy settings enabled

### No Data Showing
- Verify your PSN profile is not set to private
- Ensure you have recent gaming activity on your account
- Check your internet connection