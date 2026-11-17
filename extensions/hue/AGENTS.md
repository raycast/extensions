# Philips Hue

A Raycast extension in the [raycast/extensions](https://github.com/raycast/extensions) monorepo, which squash-merges
pull requests. Here `git show REV:./path` resolves from the current directory, while `REV:path` resolves from the
monorepo root. Constants and their reasons live in code comments; this file covers what spans files.

## Code Preferences

- Prefer the solution that introduces the least amount of new code
- Use best practice solutions and idiomatic React/TypeScript
- The extension should be and feel snappy. When a change touches rendering, images or state flow, measure
  first-render and per-change cost and report numbers: bundle the module with esbuild to time it outside Raycast, and
  count wire size, since Raycast's runtime sends each changed render as the whole tree's JSON, gzipped above 30 KB.
- `src/lib/types.ts` models the Hue V2 API completely and correctly, hand-written, not trimmed to the fields in use. A
  real bridge response beats the official reference, which beats openhue and aiohue (e.g. grouped_light owners with
  rtype `private_group`).

## Build, Lint & Test

```bash
npm run build    # ray build -e dist
npm run dev      # ray develop (needs a Hue Bridge on the local network)
npm run lint     # ray lint
npm run fix-lint # ray lint --fix
npm test         # tsc -p test && vitest run
```

- `-e dist` names the environment, not a folder: `build` and `dev` both install into
  `~/.config/raycast/extensions/hue`, so a build replaces a running `ray develop`'s output. `-o <dir>` builds
  elsewhere. `ray develop` rebuilds on every save and logs to `dev.log` in that folder.
- Quick checks: `npm test`, whose `tsc -p test` type-checks `src` too, and `npx prettier --check src`.
- Lint has no react-hooks rules, so it misses hook-order bugs such as a conditional hook call.
- npm is the package manager; the monorepo ignores `pnpm-lock.yaml`.

## Changelog

New entries go at the top of `CHANGELOG.md`, dated `{PR_MERGE_DATE}`, which is replaced when the PR merges:

```markdown
## [Title] - {PR_MERGE_DATE}

- Change description
```

Entries describe user-visible changes since the last release, in the commit that makes them. Extend the pending
section's lines rather than adding one per commit, and leave out fixes to behavior that hasn't been released.

## Testing

`npm test` type-checks `test/` and `src` and runs Vitest on the current Node. Raycast runs extensions on its own Node
22, whose `http2` differs (a request on a closed session throws synchronously only there), so run the suite on it too:
`"$HOME/Library/Application Support/com.raycast.macos/node/runtime/"node-v22.*/bin/node node_modules/vitest/vitest.mjs run`.

- `tsc -p test` needs the `Preferences` type from `raycast-env.d.ts`, which git ignores and only `npm run build` or
  `npm run dev` writes, so a fresh clone needs one of them before `npm test`.
- For writing tests, `test/AGENTS.md` describes the Raycast stub, global mocks, fake bridge and fixtures.
- Left to `npm run dev` on a physical bridge: rendering and `useHue`'s wiring (there is no React renderer), gradients,
  glyphs and wording.

## Architecture

### Hue API

- Uses Hue API V2 (CLIP) over HTTP/2 with TLS.
- `lib/hueBridge.ts` finds, links with and connects to the bridge, and owns the saved config.
- The official docs at developers.meethue.com need a free developer login.
- One persistent HTTP/2 session per command run, background runs of Toggle All Lights included. Real-time
  updates via Server-Sent Events (`/eventstream/clip/v2`).
- API resource fetches in `HueClient.getResources()` MUST be sequential (not `Promise.all`). The bridge
  answers 429 once more than 8 requests are in flight from one computer, whatever the session or command, and
  openHAB found PUTs alongside GETs confuse it. `makeRequest` retries 429 and 503 twice: the bridge sends them
  before handling a request.
- TLS validates the certificate against the bundled Hue roots, current and secondary
  (`assets/huebridge_cacert.pem`). Connections go to the bridge's IP without SNI, which the bridge
  doesn't need, and `bridgeTlsOptions()` in `lib/hueBridge.ts` checks the subject CN against the
  bridge ID instead of the hostname.

### Raycast

- Raycast's docs as one file: `https://developers.raycast.com/llms-full.txt`. The npm `@raycast/api` holds only
  types and the CLI; the minified runtime is in Raycast.app, under
  `Contents/Resources/macos-app_RaycastDesktopApp.bundle/Contents/Resources/api/node_modules/@raycast/api/`.
- A view command runs while its window is open and for Pop to Root's timeout after (90 s by default, 180 s at most).
  Preferences can't change while it's open.
- Textfield preferences have `"default": {}`: Raycast's settings window resets a field with a string default while
  the user types.
- The view commands and Toggle All Lights share the `RESOURCES_CACHE_NAMESPACE` Cache, which survives store updates:
  a type change that older cached shapes don't satisfy needs a new namespace, clearing the old one as `useHue` does.
  Its plain JSON files, in `~/Library/Application Support/com.raycast.macos/extensions/hue/com.raycast.api.cache/`,
  show a real bridge's resources.
- The manifest declares macOS and Windows. mDNS discovery on Windows is untested.

### State Machine

Bridge lifecycle is managed by an XState v5 machine (`hueBridgeMachine.ts`, whose `@see` links its visualisation),
which `useHue` runs with `useMachine`.

- `setup()` types the events and names every actor, guard and action, so an unknown event or a missing actor input
  fails to compile. Transition targets are strings tsc doesn't check: a wrong one throws when the module loads.
- Each toast is a `toast` actor its state invokes, so it shows on entry and hides on exit, also when Unlink interrupts.
  Raycast's `hide()` hides whichever toast is showing, so the actors queue their requests: a state left at once would
  otherwise hide the next state's toast. Failure states take their message from `context.errorMessage`.
- `ManageHueBridge` maps every top-level state name to a Detail view or `null`, typed so a missing or stale state
  fails to compile. Discovery is the nested `discovering` state, one view and one toast.
- Unlink drops the client and restarts from the preferences. `useHue` closes a dropped client, and the client when the
  command closes, since a stopped machine runs no exit actions. `connect` and `link` close a client that arrives after
  Unlink stopped them, and `link` doesn't save the config then.

Bridge discovery order, once the IP preference is valid (an invalid one stops at Failed to load preferences):

1. Saved config in LocalStorage (key: `"bridgeCredentials"`), its IP and username overridden by their preferences
   (`loadBridgeConfig`)
2. IP preference
3. mDNS (`bonjour-service`)
4. MeetHue public API (`discovery.meethue.com`)
5. "No bridge found" UI with retry

Any known IP, manual or discovered, leads to the link-button screen. It asks the bridge once a second, on one session,
for up to 5 minutes, so it links as soon as the button is pressed, and at once with a username preference.
Toggle All Lights skips the machine: it calls `loadBridgeConfig` and fails when no config is saved.

Recovery, without unlinking:

- **Moved bridge**: when the saved IP doesn't answer, `connectToBridge` rediscovers with mDNS, then MeetHue, connects
  if the certificate CN is the saved bridge ID, and saves only the new IP. Not with an IP preference, after a 403, or
  in Toggle All Lights' background runs (MeetHue allows one request per 15 minutes).
- **Rejected username** (403, `UnauthorizedError`): connecting leads to `unauthorized`, the Link Again screen, which
  keeps the bridge's ID and the IP that answered, saving a moved bridge's new one. A 403 on a change destroys the
  session, so reconnecting gets there too: closing it would wait for the event stream, which the bridge may keep open.
  Linking only checks a username preference, so its 403 leads there as well, and with a username preference the
  screen points to it instead of offering Link Again, which would check it again. Failure screens name a set IP
  preference.
- **Dropped connection**: `connected` invokes `watchClient`, which turns `HueClient.onDisconnect` (session closed or
  GOAWAY) into `DISCONNECTED` and reconnects. The event stream's end closes the session, and a request without an
  answer in 5 seconds destroys it. A client that drops within 10 seconds of connecting goes to Failed to connect.

### Rate Limiting

Three layers protect against Hue Bridge API rate limits:

- **Individual lights** (`lightsQueue`): 10 requests/sec, one at a time, unlimited queue depth
- **Grouped lights** (`groupedLightsQueue`): 1 request/sec, one at a time, unlimited queue depth
- **User input** (`useInputRateLimiter`): Drops input sooner than 100 ms (lights) or 1 s (groups)
  after the last, matching their queues

Scene recalls (`updateScene`) bypass all three.

### Optimistic Updates

The view commands' light, group and scene mutations go through `applyUpdate()` in `helpers/raycast.ts`:

1. Apply the changes to the lights in React state immediately. Rooms and zones aren't stored:
   `getGroupedLightFromGroup` works out their state from their lights while rendering, as the API reference
   defines grouped lights: on while any light is on, at the average brightness of the dimmable lights that are on
   (the bridge leaves plugs out). Scenes follow
   the bridge too: a recalled scene turns static and other active scenes with one of its lights inactive; switching
   a light on or off or changing its color ends its active scenes, dimming doesn't
2. Send API request (see Rate Limiting)
3. On error, undo the optimistic changes and show a failure toast. A newer pending change to the same property takes
   over what to restore, a newer successful one stays, and events update what an undo restores
4. Event stream may override with the real state at any time

### AI Tools

Raycast AI controls lights by name through four tools in `src/tools`, one per resource type: `get-lights`,
`control-light`, `control-group` and `recall-scene`. They share `helpers/tools.ts`:

- Each call connects through `withHueClient`, like Toggle All Lights, and closes the client after, also when it
  fails. Tools render nothing and write no cache.
- Names match case-insensitively on the whole trimmed name, a room wins over a zone, and a name two rooms or two
  zones match is rejected. Errors for a wrong input say how to correct the call. Skipped and failed targets go in the
  returned summary; a tool throws only when nothing changed and something failed.
- Relative changes are the bridge's `dimming_delta` and `color_temperature_delta`, sent without `on`. Rooms, zones
  and all lights (`bridge_home`) change through their grouped light, except colors, which go to each light.
- The CLI derives each tool's schemas from its default export: the input is one type literal whose JSDoc the AI
  reads, unions are all string literals or all booleans, and the output schema leaves out what it can't express.
  `ray build --print-tool-schemas` shows them.
- `ai.yaml` holds the instructions and evals, both unverified until a Raycast Pro trial.

### Image Generation

Gradients and light icons are SVG data URIs that `svgImages.ts` builds while rendering, to look like the Hue app's
cards: colors blend from left to right, and brightness shades them from the top down. Their constants are explained
in `svgImages.ts`, `colors.ts` (whites) and `hueResources.ts` (palettes). What the code doesn't say:

- The gradients were fitted to 16 screenshots of the app at 1 to 100% brightness (RMS error 5/255 from light
  state to pixels). iPhone screenshots are Display P3: convert them with
  `magick in.png -profile "/System/Library/ColorSync/Profiles/sRGB Profile.icc"` before sampling, or every fitted
  color comes out duller.
- Raycast renders filled paths sharply, but masks and filters at a lower resolution, so glyphs never use those.
- Glyph color uses `chroma.contrastAPCA`, because WCAG 2's ratio picks black on saturated reds and purples, where
  APCA picks white.

Glyphs are single-path SVGs in a 512-unit square: `assets/glyphs/lights/<archetype>.svg` and
`assets/glyphs/rooms/<archetype>.svg`, read once per command. They were converted from
`assets/flutter_assets/packages/hux/fonts/icons.ttf` in the Hue app's Android APK (5.21). The font has no glyph names,
so archetypes were matched to codepoints by eye; rooms are U+E091-U+E0CB, U+E049 and U+E190-U+E192. Missing archetypes
fall back to `unknown_archetype` for lights, which covers 25 newer ones without a clear glyph, and `other` for rooms.

## Known Hue API Quirks

- **Transition time on group toggle causes minimum brightness**: With `dynamics.duration`, a
  grouped_light turns off at once and back on at the lowest brightness. Without it the bridge fades
  both ways, so group toggles must omit dynamics. (Still unfixed in firmware 1978418030, Oct 2026.)
- **"soft off" error on group toggle**:
  `'device (grouped_light) is "soft off", command (.on) may not have effect'` is expected:
  `HueClient.updateGroupedLight` swallows it. "Soft off" means the light is off via software but physically powered.
- **One HTML error page for everything**: a rejected username (403, also on the event stream), too many requests
  (429) and, per openHAB, even a 200 get nginx's "Oops, there appears to be no lighting here" as `text/html`. Only
  the status means anything. No `Retry-After`.
- **429 above 8 requests in flight per computer**, across sessions, though the bridge advertises 128 concurrent
  streams.
- **GOAWAY** after 180 seconds without a request in flight, and after about 1000 requests on a session (nginx).
- **No keep-alive on the event stream**: it's silent between changes, so a connection lost without a reset only
  shows when a request times out.
- **Certificate dates**: macOS's curl rejects the bridge certificate's notBefore format, so probe with Node's `http2`.
- **Grouped changes apply per light**: a grouped `dimming_delta` or `color_temperature_delta` moves each light from
  its own level, and a grouped `color_temperature` is clipped to each light's range. A delta with `on: true` turned
  lights on from their own level, but one then read 0%.
- **No grouped color** for a room of white lights: 207, "Color feature not supported by grouped light resource".

Probed on a BSB002 with firmware 1978418030, Oct 2026.

## Design Decisions

- **Multiple bridges not supported**: The code explicitly assumes one bridge per network. Supporting
  multiple bridges would add significant complexity and isn't possible to test with only one bridge.
- **SetScene is both a standalone command and a sub-view**: Pushed from `controlGroups.tsx` with a
  `group` prop to filter scenes. When `props.group` is undefined, it renders all scenes grouped by
  room/zone. This dual-mode is intentional. `SetSceneCommand` is the command's entry point. Control
  Groups pushes `SetScene` with its own `hue` object, so the sub-view reuses the parent's bridge
  connection instead of opening a second one. The pushed view reads scenes through
  `useHueResources()`, so they stay live, and `applyUpdate` reads the client from the bridge actor.
  Its group and loading state stay as pushed.
- **XState stays**: replacing the machine was considered and rejected, and v6 was still in alpha in Oct 2026.
