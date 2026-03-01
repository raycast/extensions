# ZBD Raycast Integration

A Raycast extension that runs the `zbdw` CLI and renders structured wallet results directly in Raycast.

## What This Gives You

- Full top-level command parity with `zbdw`
- JSON-first result rendering for deterministic UX
- Structured error mapping from CLI envelopes
- Secure API key handling through Raycast `password` preferences
- Contract verification to prevent command drift

## Command Coverage

This extension includes all top-level `zbdw` command groups:

- `init`
- `info`
- `balance`
- `receive`
- `send`
- `payments`
- `payment`
- `paylink`
- `withdraw`
- `onchain`
- `fetch`

## Architecture

The extension is intentionally thin:

1. Collect user input in Raycast forms
2. Execute `zbdw` as a subprocess (array args, no shell)
3. Parse JSON stdout
4. Render success/error payloads as formatted JSON

Business logic stays in `@zbdpay/agent-wallet` (`zbdw`) so behavior remains aligned with the CLI contract.

## Preferences

Configure these in Raycast extension preferences:

- `apiKey` (required, password)
- `cliPath` (optional absolute path override for `zbdw`)
- `apiBaseUrl` (optional `ZBD_API_BASE_URL` override)
- `aiBaseUrl` (optional `ZBD_AI_BASE_URL` override)

## Prerequisites

- macOS + Raycast installed
- Node.js 22+
- One of the following available at runtime:
  - `zbdw` in PATH
  - bundled local `@zbdpay/agent-wallet` dependency (installed with this extension)
  - internet access for `npx -y @zbdpay/agent-wallet@latest` fallback

## Local Development

```bash
npm install
npm run test
npm run verify:contracts
npm run dev
```

### Build

```bash
npm run build
```

## Validation Scripts

- `npm run test` - unit/integration checks for runner + contracts
- `npm run verify:contracts` - manifest contract parity checks
- `npm run lint` - Raycast lint pipeline
- `npm run build` - production extension build

## Project Structure

```text
assets/
scripts/
src/
  components/
  lib/
  *.tsx commands
test/
```

## Notes

- Contract checks support simulation flags for failure-path testing:
  - `--simulate-missing-field <field>`
  - `--simulate-command-mismatch <command>`
- Runtime execution order:
  1. use explicit `cliPath` if configured
  2. try `zbdw` from PATH
  3. fallback to bundled local `@zbdpay/agent-wallet` CLI
  4. fallback to `npx -y @zbdpay/agent-wallet@latest`
- If `ray lint` fails on author validation, set `package.json.author` to your real Raycast handle.

## License

MIT
