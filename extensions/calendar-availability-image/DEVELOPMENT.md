# Development

Requirements: Raycast and Node.js 22.22 or later.

```bash
npm install
npm run dev
```

`npm run dev` registers the extension in Raycast. It stays there even after you stop the process.

## Tests

```bash
npm test
```

Runs the unit tests for the calendar logic in `test/*.test.ts` with Node's built-in test runner. The tests run in the `Europe/Berlin` time zone so that the daylight saving cases are reproducible.

## Manual Run Without Raycast

```bash
npx esbuild test/run.ts --bundle --platform=node --outfile=.tmp/run.js
node .tmp/run.js test/sample.ics .tmp/out.png 2026-11-10T10:20:00+01:00
```
