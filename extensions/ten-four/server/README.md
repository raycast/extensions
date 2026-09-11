# Ten Four shelf service

A dependency-free Node HTTP server that owns the shelf JSON store and exposes
`/shelf`. Run it on a tailnet host (Guppy); the CLI and Raycast extension reach
it over the tailnet.

## Run

```sh
export TENFOUR_TOKEN="$(openssl rand -hex 32)"
node server/shelf.js        # listens on 127.0.0.1:7801
```

`TENFOUR_TOKEN` is required and protects requests that reach the loopback
listener, including from other local users or processes. Configure the same
value as the Raycast **Shelf Token** preference and in `TENFOUR_TOKEN` for
remote CLI commands. Override the listener with `PORT`, `TENFOUR_FILE`, and
`TENFOUR_HOST`.

The service also binds loopback and refuses to start on any other address unless
you set `TENFOUR_ALLOW_ANY_HOST=1` to say the network is already trusted.

## Run as a service (systemd, user unit)

```sh
mkdir -p ~/.config/ten-four
chmod 700 ~/.config/ten-four
printf 'TENFOUR_TOKEN=%s\n' "$(openssl rand -hex 32)" > ~/.config/ten-four/shelf.env
chmod 600 ~/.config/ten-four/shelf.env
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
