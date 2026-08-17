# Ten Four shelf service

A dependency-free Node HTTP server that owns the shelf JSON store and exposes
`/shelf`. Run it on a tailnet host (Guppy); the CLI and Raycast extension reach
it over the tailnet.

## Run

```sh
node server/shelf.js        # listens on 127.0.0.1:7801
```

Override with `PORT`, `TENFOUR_FILE`, `TENFOUR_HOST`.

## Run as a service (systemd, user unit)

```sh
mkdir -p ~/.config/systemd/user
cp server/ten-four-shelf.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now ten-four-shelf
systemctl --user status ten-four-shelf
```

## Expose on the tailnet

Map the `/shelf` path to the loopback port with TLS:

```sh
tailscale serve --bg --set-path /shelf http://127.0.0.1:7801/shelf
```

The shelf is then reachable at `https://<host>.<tailnet>.ts.net/shelf`
(e.g. `https://guppy.tail72863e.ts.net/shelf`). Point `TENFOUR_URL` (CLI) and the
Raycast "Shelf URL" preference at that URL.
