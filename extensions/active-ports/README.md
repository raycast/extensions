# Active Ports

Raycast extension to view and manage active TCP ports on your system.

## Features

- List all listening ports with process info and service detection
- Detect Vite, FastAPI, Flask, Next.js, SvelteKit, and Docker containers
- Kill processes, open in browser, restart on a different port
- Docker actions: restart, stop, view logs, open shell
- Menu bar widget showing active port count
- Hide/unhide ports you don't want to see

## Commands

| Command | Description |
|---------|-------------|
| Show Active Ports | List all active ports with process information |
| Active Ports Menu | Menu bar showing active port count with quick actions |

### Service-Specific Actions

| Service | Actions |
|---------|---------|
| FastAPI | Open /docs, Open /redoc, Restart with --reload |
| Docker | Restart/stop container, view logs, open shell |
| Vite | Restart on different port |
| Next.js | Restart on different port |
| Flask | Restart with --debug |
| SvelteKit | Build and run preview |

## Install

```bash
bun install
bun run build
bun run dev
```

## License

MIT
