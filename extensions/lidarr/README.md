# Lidarr

Manage your Lidarr instance from Raycast: browse artists, search/add artists, monitor queue, and review history.

### Instance Setup
- Website: https://lidarr.audio/
- Docs: https://wiki.servarr.com/lidarr
- GitHub: https://github.com/Lidarr/Lidarr

### How to Get API Key
1. Open your Lidarr web UI (for example `http://lidarr-host:8686`)
2. Go to `Settings > General`
3. Copy the API key

### Preference Setup Tips
- `Host` accepts either a plain host/IP (`192.168.2.141`) or a full URL (`http://192.168.2.141:8686`).
- `Port` should be only the numeric port (`8686`) and is ignored if already included in `Host`.
- `Connection Type` should match your Lidarr server (`HTTP` or `HTTPS`).
- If Lidarr is served from a subpath, set `URL Base` (example: `lidarr` for `http://host:8686/lidarr`).
