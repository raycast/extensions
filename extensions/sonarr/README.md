# Sonarr

View your Sonarr instance, upcoming shows and much more

### Requirements
- Raycast for macOS or Windows
- Sonarr v3.0+ running and reachable from the machine Raycast runs on
- Sonarr API key (Settings > General > Security)

### Instance Setup
- Website: https://sonarr.tv/
- Sonarr docs: https://wiki.servarr.com/sonarr
- Github: https://github.com/Sonarr/Sonarr

### How to get API Key?
1. Open http://sonarr-host-ip:host-port
2. Settings > General
![CleanShot 2022-07-19 at 08 32 26](https://user-images.githubusercontent.com/43297314/179751442-47887bd8-864a-4d3f-a1b0-045043c6b9af.png)
3. Copy API Key
![CleanShot 2022-07-19 at 08 32 40](https://user-images.githubusercontent.com/43297314/179751488-12bd4658-fa5d-43d5-82da-e9499db21357.png)

### Preference Setup Tips
- `Host` accepts either a plain host/IP (`192.168.2.141`) or a full URL (`http://192.168.2.141:8989`).
- `Port` should be only the numeric port (`8989`) and is ignored if already included in `Host`.
- `Connection Type` should match your Sonarr server (`HTTP` or `HTTPS`).
- If Sonarr is served from a subpath, set `URL Base` (example: `sonarr` for `http://host:8989/sonarr`).
- `Instance Name` is only a label: it names the instance in the search bar and in the switch action.

### Two Sonarr Instances
The extension can talk to a second Sonarr server and switch between the two from any command.

1. Enable `Second Instance` in the extension preferences.
2. Fill in `Second Instance Host`, `Second Instance Port`, `Second Instance Connection Type` and `Second Instance API Key` — the same four values as the first instance, with the same rules (`Second Instance URL Base` for a subpath, and a full URL in `Host` also works).
3. Optionally name it with `Second Instance Name`.

`Active Instance` decides which one commands start on, and changing it takes effect right away even if you had switched manually before. From any command, the `Instance` section of the action panel switches to the other one (`⌘⇧I` on macOS, `Ctrl+Shift+I` on Windows). The choice is remembered: it applies to every command and survives closing Raycast, until you switch back.

`Instance Status` lists every configured instance, tests each connection, and reports a second instance that is enabled but still missing its host or API key.

### Extension Usage
https://user-images.githubusercontent.com/43297314/179749726-0919e1d8-686f-4e45-8440-85fecdc35414.mp4
