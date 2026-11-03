# Aria2 Download · extension

Raycast extension for the local aria2 engine in `../engine`.

## Development

```powershell
cd extension
npm install
npm run dev       # ray develop, dev extension appears in Raycast
npm run typecheck
npm run lint
npm run build
```

`predev` / `prebuild` copy `../engine` into `assets/engine` so the extension is self-contained at runtime. The copied engine is ignored by git.

## Commands

- **Aria2 Tasks** — unified list for direct URLs, torrents, magnet/BT and LinkSwift netdisk tasks.
- **Add Download** — one entry for URLs, magnet links, and local `.torrent` files; source selector, directory, connections, advanced headers, seeding.
- **Aria2 Configuration** — aria2 settings (HTTP + BT), auto-start on add, auto-stop when all downloads finish, saved to `settings.json`.
- **Toggle Aria2** — one no-view command; dynamic subtitle shows Running/Stopped/Busy, refreshed in the background every minute.

## Chunk view

- **PNG Heatmap** (default): fixed 48×12 rounded-cell heatmap encoded by Node `zlib` and written to `environment.supportPath`; it scales as a whole with the Raycast window. It does not measure the window or reflow columns.
- **Native Mosaic**: Raycast `Grid` fallback, 8 columns of color blocks; no image dependency.
- Switch with the **Chunk View** preference.

The map is piece completion from aria2's `bitfield`, not per-connection offsets.

## Runtime state

The engine keeps state under `%LOCALAPPDATA%\lat3ncy-toolbox\aria2`:

```text
install.json
settings.json
rpc-secret.txt
aria2.runtime.conf
session.txt
aria2.log
rpc.log
```

The extension reads `settings.json` and `rpc-secret.txt`; connection preferences can override the endpoint/secret for a remote RPC.

## Engine setup

Install aria2 once:

```powershell
winget install aria2.aria2
# or scoop install aria2
# or use the official Windows ZIP from https://aria2.github.io/
```

The extension automatically discovers `aria2c.exe` in PATH or common install locations. On first start it creates `settings.json`, `rpc-secret.txt` and `aria2.runtime.conf`; no Initialize script or manual configuration is required. If aria2 is missing, Raycast prompts and offers to open the official website.

## LinkSwift

LinkSwift pushes netdisk direct links to the same RPC endpoint. Do not paste netdisk direct links into Add Download: the missing Cookie/Referer/User-Agent will usually return 403/412. Add Download detects netdisk domains and redirects you to LinkSwift.

## License

MIT. See the repository root `LICENSE`.
