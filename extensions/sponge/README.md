# Sponge

Save links to your [Sponge](https://sponge.computer) reading library and search what you have saved, without leaving Raycast.

## Setup

These commands use the Sponge command-line tool on your Mac. Install it with Node.js 24.20 or later:

```sh
npm install --global @hraness/sponge
sponge init
```

`sponge init` creates your library. Skip it if you already have one. The [setup guide](https://sponge.computer/docs/agents) covers the rest.

The extension looks for `sponge` in `/opt/homebrew/bin`, `/usr/local/bin`, `~/.npm-global/bin`, `~/.volta/bin`, `~/.local/bin` and nvm's Node.js folders. If yours is elsewhere, choose it in the extension's preferences. You can also pick a library other than your default one there.

## Commands

- **Save URL** adds a link to your library. Leave the argument empty to save the URL on your clipboard. Sponge queues the page for capture; a configured Sponge worker (`sponge worker install`) or `sponge run --drain` captures it.
- **Search Library** finds saved text with keyword search. Open a result to read it, open its original page or copy its ID.
- **Show Recent Items** lists the 50 newest items in your library.

Everything runs on your Mac through the Sponge CLI. The extension does not sign in, sync or send your reading anywhere.
