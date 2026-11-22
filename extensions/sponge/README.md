# Sponge

Save links to your [Sponge](https://sponge.computer) reading library and search what you have saved, without leaving Raycast.

## Setup

These commands use the Sponge command-line tool on your Mac. Install it with Node.js 24.20 or later:

```sh
npm install --global @hraness/sponge
sponge init
```

`sponge init` creates your library. Skip it if you already have one. The [setup guide](https://sponge.computer/docs/agents) covers the rest.

The extension looks in the standard Homebrew and npm folders, nvm, and your PATH. It checks each executable for the Sponge reading-library help screen, so you can also have moreutils installed. To use a specific CLI or library, choose it in the extension’s preferences.

## Commands

- **Save URL** adds a link to your library. Leave the argument empty to save the URL on your clipboard. Sponge queues the page for capture; a configured Sponge worker (`sponge worker install`) or `sponge run --drain` captures it.
- **Search Library** finds saved text with keyword search. Open a result to read it, open its original page or copy its ID.
- **Show Recent Items** lists the 50 newest items in your library.

Everything runs on your Mac through the Sponge CLI. The extension does not sign in, sync or send your reading anywhere.
