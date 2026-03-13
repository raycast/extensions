# NMBS Planner
Plan and preview train connections using the iRail API for NMBS/SNCB data.

## Description

`nmbs-planner` is a small Raycast extension that fetches train connection information (departure, arrival, duration, platform, and intermediate stops) and presents it in a compact list/detail view.

## Features

- Query departure and arrival stations and receive the next connections.
- Shows departure/arrival times, platforms, duration and intermediate stops.
- Built as a Raycast command (`trainride`) with `from` and `to` arguments.

## Requirements

- Raycast (for running the extension)
- Node.js and npm (for development tasks)

## Installation

1. Fork the extension from Raycast:

> https://developers.raycast.com/basics/contribute-to-an-extension#get-source-code

2. Install dependencies:

```
npm install
```

## Development

- Run in development mode (Raycast):

```
npm run dev
```

- Build for publishing:

```
npm run build
```

You can also run linting and type checks with:

```
npm run lint
npm run type-check
```

## Usage

This repo defines a Raycast command named `trainride`. The command accepts two arguments:

- `from`: origin station (text)
- `to`: destination station (text)

Example (in Raycast): run the `Trainride` command and enter `from=Brussels` and `to=Antwerp`.

## API and Links

- This project uses the iRail public API for train connection data: `https://api.irail.be/`.
- Official NMBS / SNCB websites:
	- `https://www.belgiantrain.be/nl` (NMBS Dutch/French site)

## Relevant files

- `package.json` — Raycast extension metadata and scripts
- `src/utils/index.ts` — small wrapper that calls the iRail connections endpoint
- `src/trainride.tsx` — Raycast UI component that renders results
- `src/types/index.ts` — TypeScript interfaces for the API response

## Contributing

If you'd like to contribute, open an issue or a pull request. Follow the existing code style and run lint/type-check before submitting changes.

## License

This project is licensed under the MIT License (see `package.json` for metadata).

## Author

Author information is available in `package.json`.

