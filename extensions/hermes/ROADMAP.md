# Roadmap

Where this project is and where it is going. Not a release schedule — a statement of priorities, so
that nobody has to guess whether a missing thing is missing on purpose.

Current state: 15 commands shipped, 316 automated tests, no Raycast Store listing yet.

## Next

**Publish on the Raycast Store.** The Title Case blocker is gone: the interface is in English and
`ray lint` runs with zero warnings, where it used to report fourteen. What is left before
submission is the Store metadata — the screenshots in `metadata/`, at 2000x1250 — and one more
pass of the manual checklist on the translated screens, since every string on them changed.

**Demo GIF and screenshots.** A UI product with no picture in its README is asking a lot of a
reader.

**i18n: decided, and the answer is no layer.** The interface is English, hard-coded at the call
site, and it stays that way. Raycast does not localize an extension: the command titles, the
descriptions the Store shows and every screen string are fixed strings in the package, so a
string layer would still have to pick one language to ship. English is the one that reaches the
most people. The Portuguese copy is preserved in the git history and the documents under `docs/`
remain in Portuguese, because they are for whoever works on the code, not for whoever uses it.

**Long-conversation performance.** The derivation cache is a fixed 128-entry LRU while the render
cap grows in steps of 40 with no ceiling. Conversations past roughly 160 exchanges will start
thrashing it. This is a known shape, not a bug, and it deserves a measurement before anyone changes
a number.

**Close the manual-validation gap.** Streaming, approvals and every keyboard flow live in
[`docs/CHECKLIST-MANUAL.md`](docs/CHECKLIST-MANUAL.md) and are walked by hand — the Raycast window
is not visible to screen automation on Windows, so no amount of test-writing removes this step.
Anything that can be pulled out of the checklist into a contract test should be.

**First macOS pass on real hardware.** The manifest now declares `"platforms": ["macOS", "Windows"]`
and the code paths are covered by tests, but nobody has run the extension on a Mac yet. The three
things to prove there: the `hermes://` deep link actually focuses a conversation in Hermes Desktop,
the `Cmd`-based shortcuts do not collide with anything Raycast reserves, and auto-detection finds
`~/.hermes` on a normal install. The macOS section of the checklist lists them.

## Later

- **Attachments and images**, once the API's multimodal format is verified rather than assumed.
- **Deeplinks** into extension commands.
- **A Raycast AI tool**, so Raycast's own AI can call controlled Hermes capabilities.
- **Optional remote Hermes support.** Today the extension talks to `127.0.0.1` and nothing else,
  and that constraint is doing real security work. Loosening it is a design problem first.
- **A second look at macOS ergonomics**, once the first pass on real hardware happens. Support is
  in — the manifest declares `"platforms": ["macOS", "Windows"]` — but shortcut choices there were
  made by reading Raycast's tables, not by using them.

## Not planned

- Reproducing all of Hermes Desktop. This is a compact interface to Hermes, not a second client.
- Editing Hermes' internal configuration, authenticating providers, or installing anything.
- Any destructive action without an explicit approval step.
- A generic framework layer built ahead of a validated command.

## Depends on Hermes, not on this extension

Listed so nobody spends a weekend on them here:

- **Branching does not sync like the rest.** Hermes creates the child conversation with origin
  `api_server`, and it does not show in the Hermes Desktop main list. The extension warns about it;
  fixing it means changing Hermes.
- **`jobs_admin` availability.** When the server answers `501`, Automações reports unavailable.
  That is the server's answer, not a gap in the screen.
- **Voice, long-term memory and session features** exposed by Hermes have no interface here yet,
  and their shape is set upstream.
