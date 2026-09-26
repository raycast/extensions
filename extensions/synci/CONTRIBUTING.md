# Contributing

This is the source repository for Synci's Raycast extension. Bug reports and focused pull requests are welcome.

## Set up

Install Raycast and Node.js 22.22.2 or later on macOS or Windows, then run:

```sh
git clone https://github.com/synciio/synci-raycast.git
cd synci-raycast
npm ci
npm run dev
```

The extension appears in Raycast and reloads when you edit the source. The development build uses Synci's shared public OAuth client. Do not add a client secret or commit local credentials.

## Validate a change

Run `npm run check` and `npx ray build -e dist`. Exercise affected commands in Raycast, including error states and both list layouts. For platform-related changes, test on both macOS and Windows; CI covers type checking, unit tests, source lint, and builds on both systems.

Full `ray lint` checks the `synci` organization through an authenticated Raycast endpoint, including in its relaxed mode. Contributors without organization access can run `npm run lint:source` for ESLint and Prettier checks after building, type checking, and testing. Maintainers must still run full lint before a Store submission. CI uses source lint so public contributions do not require a Raycast credential.

For AI changes, run `npx ray login` and `npm run evals` using an eligible Raycast account. Check the actual results: the CLI can return a successful exit code even when evaluations fail. Keep the expectations meaningful; infrastructure or entitlement errors do not count as passes.

Use synthetic financial records in tests and AI fixtures. Remove tokens, account identifiers, and personal financial data from bug reports and logs. Only include screenshots approved for public distribution.

## Propose a change

Describe the problem, the resulting behavior, and how you verified it. Keep financial operations read-only and preserve currency separation, complete pagination, and explicit handling of unavailable or stale data.

Before opening an issue, check for an existing report and include the steps needed to reproduce the problem, your operating system, and your Raycast version.
