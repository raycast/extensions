# Steam

[![](https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square)](https://github.com/LitoMore/raycast-cross-extension-conventions)

Search and view information about any game on steam, as well as games you own.

Get an API token here (optional): https://steamcommunity.com/dev/apikey

Search is powered by this public repo: https://github.com/KevinBatdorf/steam-api

Source repo: https://github.com/KevinBatdorf/steam-raycast

Notes:

- While rare, you may hit the Steam API rate limit. If that's the case, just wait a few moments and try again.
- Sometimes the Steam API sends a random language. There doesn't seem to be any logic to this. Just press escape and try again.
- Sometimes games are removed from Steam yet still show in the API. To avoid extra network costs, the extension will just provide feedback that the game no longer exists.
- Icons will only show if you own the game. Steam doesn't send the icons via the public api.

## Features

- Search all games on Steam
- Search only your games
- View details about a game
- Filter your search
- Browse SteamGridDB images (requires [SteamGridDB](https://raycast.com/litomore/steamgriddb) extension)
- Browse ProtonDB scores (requires [ProtonDB](https://raycast.com/litomore/protondb) extension)
