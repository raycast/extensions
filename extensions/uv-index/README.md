# UV Index

See the current UV index for your city or town, without leaving the keyboard.

- **UV Index** — run it to see the current UV level, your city and today's peak. The reading (with the time it was taken) then stays next to the command in search. It only fetches data when you run it; nothing runs in the background.
- **Change UV Location** — opens the setting for your city or town.
- **UV Index in Menu Bar** — off by default. Enable it in Raycast Settings → Extensions → UV Index to pin a minimal ☀️ + UV number to your menu bar. It refreshes every 15 minutes.

## Setup

The first time you run the extension, Raycast asks for your **City or Town**. Change it any time with **Change UV Location**, or in Raycast Settings → Extensions → UV Index. If your town name is shared with other places, add the state or country, e.g. `Perth, Scotland`.

## Data

UV data comes from the [Open-Meteo](https://open-meteo.com/) CAMS UV forecast, which accounts for cloud cover. It's free and needs no API key. The current value is interpolated between hourly forecasts.
