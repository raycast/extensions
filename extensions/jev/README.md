# Jev for Raycast

Type anything into Raycast's root search, press **Tab**, and
[Jev](https://docs.typesafe.ai/introduction) (TypeSafe's System One model)
turns the request into a concrete action: opening your most recent download,
launching an app, finding a file, or opening a site.

```
⌥Space → "open the pdf i last downloaded" → Tab → Enter
```

## How it works

`Ask Jev` is a Raycast **fallback command**. Once you've added it in
Raycast's settings (Setup step 4), this is the flow:

1. Open Raycast root search (your normal ⌥Space or whatever you use).
2. Type whatever you want — no command selection needed first.
3. When nothing else matches, `Ask Jev` sits at the bottom of the list with
   a Tab hint. **Press Tab** and your typed text is handed to Jev as
   `LaunchProps.fallbackText`.

If you'd rather open Jev's search box directly, you can also bind a separate
global hotkey to the command (Setup step 4).

Either way, once you're in the command, it receives your query as
`searchText`. From there:

1. Jev classifies the request (`open_download` / `open_app` / `open_file` /
   `open_url` / `unsupported`) and, in the same request, speculatively
   answers a few follow-up questions — which file type, which installed app,
   which recent file, which known site — all as TypeSafe `Choice` questions
   over real candidates: installed apps, files actually found under
   `~/Downloads` / `~/Desktop` / `~/Documents`, and a curated site table.
   Jev only ever *selects* from real options; it never invents a file path
   or app name. Those same candidate lists are also handed to the
   classifier itself as `state` (not just the raw sentence) so it can
   recognize e.g. "cursor" as a real installed app rather than guessing
   blind.
2. Plain TypeScript resolves the winning branch into one concrete target
   (exact file, app, or URL) — deterministic lookups (like finding the
   newest download of a given type, spotting an explicit URL in your text,
   or guessing `<word>.com` for an unambiguous brand name not in the site
   table) stay in code, not in the model.
3. A single preview item shows what will happen. Press Enter again to run
   it via Raycast's `open()`.

See `src/lib/typesafe.ts` for the question definitions and `src/lib/run.ts`
for how an answer becomes an action.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Get a TypeSafe API key (see <https://docs.typesafe.ai/introduction> if you
   don't have one yet).

3. Run the extension locally:

   ```sh
   npm run dev
   ```

   This opens Raycast and imports the extension. The first time you run the
   `Ask Jev` command, Raycast will prompt for its **TypeSafe API Key**
   preference — paste your key there. (You can also set/change it later via
   Raycast → `Ask Jev` → `⌘,`.)

4. Make Jev your Tab target in root search: Raycast Settings → **Advanced**
   → **Fallback Commands** → add `Ask Jev` (and drag it to the top if you
   have other fallbacks — Tab activates the first one). This is a one-time,
   user-granted opt-in Raycast requires for any extension's fallback
   command — an extension can't enable it for itself, by design.

   After this, ⌥Space → type anything → **Tab** sends the query straight to
   Jev.

   — *or*, if you'd rather have a dedicated global hotkey that opens Jev's
   search box immediately: Raycast Settings → **Extensions** → **Jev** →
   `Ask Jev` → click its hotkey field and press your combo (e.g. `⌥J`, so
   it doesn't collide with Raycast's own Option+Space).

5. Try it: open root search, type `open the pdf i last downloaded`, press
   Tab, then Enter on the preview to run it.

## Design notes from debugging real queries

The first version worked for the exact demo query ("open the pdf i last
downloaded") but failed on most other in-scope requests. Three real bugs,
fixed by changing how questions are asked rather than by special-casing
inputs:

- **The classifier judged the sentence in isolation.** `open cursor` came
  back "not sure what you mean" even though Cursor was installed, because
  the `action` question never saw the list of installed apps — it was
  guessing from the words alone. Fix: `installedApps`, `recentFiles`, and
  `knownSites` are now part of the shared `state` for every question in the
  request, and `action`'s instructions explicitly say to cross-check the
  request against them.
- **A hard confidence cutoff rejected valid-but-unfamiliar requests before
  they were even resolved.** Anything under a 0.35 confidence score was
  thrown out regardless of what it resolved to. Fix: removed — the only
  automatic bail-out now is an explicit `unsupported` classification;
  everything else attempts real resolution, and a *specific* failure (no
  matching app/file/site) is what produces the "couldn't tell…" message.
- **File search was recency-only.** Candidates were capped to the 40 most
  recently modified files, so `open my cv` failed whenever the résumé
  hadn't been touched recently — it was never even offered to Jev as an
  option. Fix: `listFileCandidates` in `src/lib/candidates.ts` now scans
  Downloads/Desktop/Documents plus one level of subfolders and ranks by a
  blend of recency *and* filename/query keyword overlap, so an
  older-but-matching file still makes the candidate list.
- **The site table was too small**, so brand names like `facebook` (not
  installed as an app, not in the table) had nowhere to resolve. Fix:
  expanded the curated table, and added a deterministic last-resort guess
  (`<single unambiguous word>.com`) in code for anything still unmatched —
  plain string handling, not model generation.

## Note on `npm run lint`

`ray lint` checks `package.json`'s `author` field against a registered
Raycast Store username (currently `"naz3eh"`). This only matters if you plan
to `ray publish` — running the extension locally via `npm run dev` doesn't
need it. If the Raycast account username is different, change `author` in
`package.json` before publishing.

## Extending it

The action set intentionally stays inside TypeSafe's closed-set `Choice`
primitive — Jev classifies and selects, code executes. To add a new action:

- Add a branch to the `action` Choice in `src/lib/typesafe.ts`.
- Build whatever candidate list it needs (or none, if it's a fixed action)
  in `src/lib/candidates.ts`.
- Resolve it to a `ResolvedAction` in `src/lib/run.ts`.

Chained/multi-step actions, arbitrary shell execution, and free-text
generation (e.g. "search the web for…") are deliberately out of scope for
this version.
