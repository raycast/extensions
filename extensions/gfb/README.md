# FotMob Fixtures Extension for Raycast

This Raycast extension allows you to view upcoming and recent football matches from selected leagues and teams using the FotMob API.

![screenshot](./metadata/screenshot.png)

## Features

- View matches for the next 30 days and the past 7 days.
- Highlight winning teams in the match list.
- Access detailed match information through clickable links.

## Prerequisites

Before you start using this extension, ensure you have Raycast installed on your system.

## Configuration

To configure the leagues and teams you are interested in go to the extension's preferences and specify fairs of league IDs and Teams IDs.

To find the league and team IDs, you check the URLs from the FotMob website or use the FotMob API wrapper to fetch the data. For example, the [league ID for the English Premier League is 47](https://www.fotmob.com/leagues/47/overview/premier-league), and [the team ID for Manchester United is 10260](https://www.fotmob.com/teams/10260/overview/manchester-united).

The extension currently supports selecting logic for only one team per league, i.e. "the team I support in that league" but you can specify the same league multiple times.

## Usage

After setting up, simply launch the Raycast extension. It will display the matches based on your configured preferences.

## Support

For any issues or feature requests, please submit an issue on the project's GitHub repository.

## Acknowledgements

- [FotMob](https://www.fotmob.com/) for providing the API used by this extension.
- [FotMob API wrapper](https://github.com/bgrnwd/fotmob) for providing the API wrapper used by this extension.
- [Raycast](https://raycast.com/) for creating the platform this extension runs on.

## License

MIT

## Copyright

© 2024 - James Turnbull
