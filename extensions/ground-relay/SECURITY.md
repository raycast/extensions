# Security posture

## Local data boundary

- Ground packets are stored only in Raycast's extension-local support directory.
- The extension has no hosted backend, analytics, account integration, or automatic context injection.
- Selected text and clipboard content are loaded only through a user-opened command.
- Copying an export into another tool is an explicit user action.
- AI save requests require Raycast confirmation and remain advisory after persistence.

## Upstream development dependency advisory

As of 2026-07-12, `@raycast/api` `1.104.22` resolves `esbuild` in the affected range for [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr).

The low-severity advisory applies to esbuild's development server on Windows. It does not describe the packaged extension runtime. The patched esbuild release is outside the current Raycast dependency range, so no forced override is included.

Until Raycast updates its dependency:

- develop on macOS when possible;
- run the Windows development server only in a trusted local environment;
- do not expose or proxy the development server;
- rerun `npm audit` after Raycast API updates.
