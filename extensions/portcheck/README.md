# Portcheck for Raycast

See what's using a port and stop it safely, from Raycast.

- **Search Ports**: every port listening on your Mac with its process, PID, user and who started it (`npm ← zsh`). Stop it (after confirming), open it in the browser, or copy its PID or command line.
- **Check Port**: is a port free? If not, which process holds it.
- **Kill Port**: stop whatever is listening on a port. Never stops system processes; Docker ports show the right stop command instead.
- **Find Free Port**: copy a free port, optionally in a range.

Requires the free, open-source [portcheck](https://github.com/roystondwork-dev/portcheck) CLI:

```sh
brew install roystondwork-dev/tap/portcheck
```

The extension finds it in Homebrew, `~/.local/bin` or `~/go/bin`, or set its path in the extension's preferences.
