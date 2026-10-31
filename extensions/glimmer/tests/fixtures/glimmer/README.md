# Glimmer automation fixtures

`contract-v1.json` is produced by Glimmer's actual `CommandJSON` encoder and
checked by its actual `GlimmerCLI.parseURL`, not a JavaScript imitation. The
fixture records the checkout revision and SHA-256 of all three Swift source files.
`generate.swift` supplies small model stand-ins and synthetic inputs based on
`GlimmerTests/GlimmerAutomationTests.swift`; it does not launch Glimmer, probe a
PC or read saved user data. This checks serialization and URL parsing, not app
dispatch or the full Swift model implementation.

On a Mac with Swift, refresh from a reviewed Glimmer checkout:

```sh
node scripts/generate-contract-fixtures.mjs ../glimmer
npx --no-install prettier --write tests/fixtures/glimmer/contract-v1.json
npm test
```

The generator compiles the shared URL parser as a small GlimmerEngine module,
then compiles the real Mac wrapper and encoder directly from the supplied
checkout in a temporary directory. Source changes should be reviewed before
running it. CI uses the committed fixture and needs no sibling checkout.

The fixtures were regenerated from the stable `2026.10.8` source at
`3e59901396c3445c04e9fe73be3d3fafb1a30ce8`. That checkout defines this contract:

- URLs accept only `stream`, `stop`, `wake`, and `quit`. `pc` is optional for
  `stop` and required otherwise; `app` is optional only for `stream`. Values are decoded once, `%20` is space and `+`
  is literal. Names, IDs and saved addresses identify PCs case-insensitively. Unknown actions,
  duplicate/unknown parameters and control characters are rejected. Quit URLs
  require confirmation; Shortcuts' quit intent has different semantics.
- `list --json` returns `version` and `pcs`; `list <pc> --json` returns `version`
  and `apps`; `status --json` returns `version`, `live`, `pc`, `app`, `resolution`,
  `fps`, `hdr`, `codec`, and `bitrateMbps`. The fixture exercises every consumed
  field, all PC states, hidden apps, nullable identities, idle/live/reconnecting
  status and nonfinite telemetry encoded as null.
- Version 1 emits all documented keys and explicit nulls. Extra fields at any
  level are ignored. Missing nullable details are treated as unknown for
  compatibility; missing required identities, collections, flags and dimensions
  are errors. Any missing, mistyped or unsupported version is a loud error.
- JSON names can contain controls (Glimmer tests an app name containing a
  newline), while URLs cannot. Such apps remain visible, with an Open Glimmer
  action instead of an invalid stream link.
- `stop [<pc>] [--json]` does not open Glimmer. It stops this Mac’s stream and
  follows Glimmer’s leave-games-running setting, just like menu bar Stop. The
  stop payload confirms disconnection, not whether the PC app was quit. The fixture sends both
  stop outcomes through the real `CommandJSON.encode` and checks untargeted
  and targeted stop links with the real Swift URL parser.
- Stop exits 0 with `{"result":"stopped","stopped":true,"version":1}` or 5 with
  `{"result":"noActiveStream","stopped":false,"version":1}`. Exit 1 means PC
  mismatch or timeout; exit 2 means invalid arguments. Both errors use stderr
  without JSON. The extension validates exit code and payload together.
- `glimmer://stop` accepts an optional `pc` query. A mismatch or malformed URL
  leaves the stream untouched. Fixtures cover accepted and malformed links;
  matching and stream side effects belong to Glimmer, not these encoder tests.
