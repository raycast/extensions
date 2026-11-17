# MITM Proxy

Control a local [mitmproxy](https://mitmproxy.org) intercept from Raycast: turn the
system proxy on and off, inspect the captured HTTP/HTTPS flows, and manage the
mitmproxy root certificate.

This is a developer tool for inspecting your own traffic on your own Mac. It runs
`mitmweb` locally and points the macOS system proxy at it; it does not send
anything anywhere else.

## Requirements

- macOS on an administrator account (changing the system proxy needs admin
  privileges).
- [mitmproxy](https://mitmproxy.org) installed, for the `mitmweb` binary:

  ```sh
  brew install --cask mitmproxy
  ```

The extension bundles the small `mitm` control script it uses, so there is nothing
else to install.

## Commands

| Command | What it does |
| --- | --- |
| Toggle Proxy | Start or stop mitmproxy, the system proxy and the background network follower |
| Proxy Status | Process, network service, proxy/HTTPS state, root CA, UI URL and password |
| Recent Flows | Browse the requests mitmproxy captured, newest first |

Starting the proxy:

1. Starts `mitmweb` detached on port `8080`, with its web UI on port `8081`.
2. Trusts the mitmproxy root CA in the login keychain, so HTTPS can be decrypted.
3. Points the active network service at `127.0.0.1:8080`.
4. Keeps the proxy on whichever network service is carrying traffic, even when you
   switch between Wi-Fi and Ethernet.

The proxy stays on until you toggle it off, even after Raycast or the terminal is
closed.

## The root certificate

mitmproxy decrypts HTTPS with its own certificate authority. Starting the proxy
asks for confirmation before trusting that CA in your login keychain. You can
remove it at any time with:

```sh
mitm untrust
```

or by running **Proxy Status → Untrust Root CA**.

## Configuration

Settings are read from `~/.config/mitm/config` when it exists:

```sh
MITM_PORT=8080          # proxy port
MITM_WEB_PORT=8081      # mitmweb UI port
MITM_SERVICE="Wi-Fi"    # pin a network service instead of auto-detecting
MITM_BYPASS="127.0.0.1 localhost *.local"  # replace the bypass list
MITM_INSECURE=1         # skip upstream certificate verification
```

## Troubleshooting

- **`mitmweb` not found** — install it with `brew install --cask mitmproxy`.
- **The proxy is on but pages do not load** — another process may hold port
  `8080`. Run `mitm status` for the listener, or change `MITM_PORT`.
- **A network service still points at a dead proxy** — toggling the proxy off
  clears every service that points at `127.0.0.1:8080`.
- **HTTPS pages fail after stopping the proxy** — remove the CA with
  `mitm untrust` if you no longer need it.
