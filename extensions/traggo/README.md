# traggo

Log time with tags using [traggo](https://traggo.net).

## Requirements

To use this extension you need a self-hosted traggo server. Consult the official [installation guide](https://traggo.net/install/) on how to do this.

Once installed, the extension requires a login to the traggo instance.

## Development

### GraphQL Code Generation

This project uses a [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) which generates React Hooks based on GraphQL operations.

Operations are located in `./src/graphql/`.

When adjustments to the operations were made, run the following to regenerate the code:

```sh
npm run codegen
```

### Docker Compose

> Requires Docker and Docker Compose

There is a `docker-compose.yml` that allows starting a local traggo server for development.

Start it using:

```sh
docker compose up -d
```

Afterwards login at [`http://localhost:3030`](http://localhost:3030) with username `admin` and password `admin`.
You want to create some `Tags` in the UI to use them later. For example `project`, `location`, `type`. You also need to start timers with tags before using the extension like `project:foobar`, `location:germany`, then they will become available in the extension.

These will later be available in the Raycast extension.
