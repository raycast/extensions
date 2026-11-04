# Honkpad

Control [Honkpad](https://honkpad.com), the meme soundboard for streamers, from Raycast.

- **Play Meme**: search the memes on your active board and press Enter to play one.
- **Random Meme**: play a random meme from the active board.
- **Stop Sound**: stop everything that is playing. Honkpad also pauses tip alerts if a Tips session is open.

## Setup

Honkpad has to be running on the same computer. It listens on `127.0.0.1:7840`.

You can usually leave the API token empty, because Honkpad lets local calls in without it. If Honkpad turns the extension away, add the token: open Honkpad → Settings → Advanced → Stream Deck and HTTP API, copy any of the URLs and paste the part after `token=` into the extension preferences.

If you changed Honkpad's port, set the same port in the preferences.
