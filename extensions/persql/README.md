# PerSQL for Raycast

Spin up and query [PerSQL](https://persql.com) SQLite databases from
the launcher.

## Commands

- **List Databases** — browse the databases in your namespace; open
  one in the console or copy its path / query URL.
- **Run Query** — pick a database, write SQL, see the results as a
  table. Copy results as Markdown or JSON.
- **Create Scratch Database** — name it, hit enter; the new
  `scratch-…` database's path lands on your clipboard.

## Setup

The extension asks for one preference on first run:

- **API Token** — a PerSQL bearer token. Mint one in the
  [console](https://console.persql.com) under **Tokens**. Creating
  databases requires an `admin`-role token; listing and querying work
  with any role.

## Development

```sh
npm install
npm run dev
```

`npm run dev` opens the extension in Raycast with live reload.

## License

MIT.
