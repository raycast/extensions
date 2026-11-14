# MapleStory

Look up Global MapleStory characters using Nexon's official rankings website. No API key is required.

## Features

- Look up North American and European characters by name
- View avatar, class, level, server, current EXP, and regional, class, and server rankings
- View Legion level, raid power, and server Legion rank when available
- Save characters to favorites and sort by name or level
- Existing MapleStory.gg favorites are preserved and refreshed from Nexon

## Data availability

Data comes from the undocumented endpoint used by [Nexon's rankings website](https://www.nexon.com/maplestory/rankings/north-america/overall/legendary). It follows the website's updates rather than live in-game progress, and only characters listed in those rankings can be found. The endpoint may change without notice.

EXP history charts, EXP percentage, and estimated Legion coins per day are no longer displayed. Historical EXP data is not provided by this endpoint. If Legion data is missing, the character profile remains available. If a saved character cannot refresh, its cached profile is retained with an error notification.

## License

MIT
