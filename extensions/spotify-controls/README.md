# Spotify Controls

Control the Spotify macOS app from Raycast.

An extensive walk-through on how to build such an extension can be found on the [developers docs](https://developers.raycast.com/examples/spotify-controls).

![screenshot](./metadata/screenshot-01.png)

# Menu Bar

The extension includes a **Now Playing** menu bar item:

- **Artwork icon**: Shows the current track’s artwork as the menu bar icon (falls back to a music icon if artwork is unavailable).
- **Track text (optional)**: You can toggle whether the current track and artist are shown next to the icon:
  - Enable or disable the text in the command preferences (`Show track text in menu bar`).

The menu bar item updates periodically while Spotify is running.
