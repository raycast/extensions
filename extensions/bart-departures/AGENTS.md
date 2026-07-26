# BART Departures Agent Guide

## Project location

The Raycast extension lives at this repository root. It was scaffolded from Raycast's Team Time template, and the current visible command is **BART Departures**.

## API and credentials

- This is a personal, local extension that uses the BART Legacy API with native `fetch`.
- Use BART's JSON station-list endpoint to populate station selection: <https://api.bart.gov/docs/stn/stns.aspx>.
- Use BART's JSON real-time ETD endpoint for departure estimates: <https://api.bart.gov/docs/etd/etd.aspx>.
- Configure the local key as the required `BART API Key` Raycast password preference. Never commit, log, display, or embed a real key.
- Keep dependencies minimal. Use native `fetch` for HTTP; do not add Axios or another HTTP client. Lodash is approved for established collection, string, and type-guard utilities when it avoids reimplementing them.

## Raycast UI

- Build with the supported Raycast component library: <https://developers.raycast.com/api-reference/user-interface>.
- Use Raycast-native `List`, `List.Item`, `Detail`, `ActionPanel`, `Action`, loading states, and `LocalStorage`; do not use custom HTML/CSS UI.
- The extension remembers the last station with `LocalStorage`, opens it on subsequent launches, and offers a Change Station action.

## Code conventions

- Define functions as `const` arrow functions rather than function declarations.
- When a collection transformation both maps and filters values, prefer a single `reduce` over a chained `.map().filter()`.

## Local workflow

- Install dependencies with `npm install` at the repository root.
- Use `npm run dev` for Raycast development, then run `npm run lint` and `npm run build` before handoff.
- Keep this local-only while its client-side BART API key is in use. A published version needs a different credential design.
