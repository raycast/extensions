# Ramback

See your Mac's dev stack with its RAM (simulators, emulators, Gradle and Kotlin daemons, Docker containers, bundlers, databases, dev servers and AI agents) and stop what you don't need.

## Setup

The extension runs the `ramback` command line tool that comes with the [Ramback](https://ramback.app) app. Install the app first, from [ramback.app](https://ramback.app) or with Homebrew:

```sh
brew install --cask heykadirhan/tap/ramback
```

The extension finds the tool inside `/Applications/Ramback.app`, or on your PATH in `/opt/homebrew/bin` or `/usr/local/bin`. Both commands work with the free version of the app.

## Commands

- **Running**: everything in your dev stack, grouped by project, biggest first. Stop a row, open a dev server in the browser or copy its URL. Pinned rows and databases ask before they stop, and Force Stop is offered when something holds on.
- **Free Memory**: stops idle simulators, emulators and daemons until about the given number of GB are free. Pinned rows, databases and running builds are left alone.
