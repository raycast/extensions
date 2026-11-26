# Publishing the RedBison Raycast extension

Everything below needs your Raycast and GitHub accounts, so none of it has been run. `npm run build`, `npm test` and every `ray lint` check except the author check pass as committed; the author check passes once step 1 is done.

## 1. Claim the author handle

`ray lint` looks `author` up at `https://www.raycast.com/api/v1/users/<author>` and fails on a 404. The manifest says `"author": "redbison"`, which was free on 2026-11-26.

1. Install Raycast (https://raycast.com) and sign in.
2. Set your Store username to `redbison` (Raycast Settings, Account, or your profile on raycast.com).
3. Check: `curl -s -o /dev/null -w '%{http_code}\n' https://backend.raycast.com/api/v1/users/redbison` prints `200`.

If you would rather publish under your existing handle, change `"author"` in package.json to that handle instead. Raycast requires a real Store username here, not a company name or an email.

## 2. Stage a standalone copy

Do not run `npm run publish` inside the RedBison repo. `ray publish` (read in @raycast/api 2.14) works on the git repository around the current folder: it refuses while anything in it is uncommitted or untracked, adds `__raycast_latest_publish_*` tags to it, and on a first publish puts the subject of every commit in `git log` into the public pull request. Publish from a small repository that holds only the extension:

```sh
cd integrations/raycast
npm ci
npm run stage -- ~/src/redbison-raycast    # any folder outside the RedBison repo
```

The stage script copies the extension there (without node_modules), runs `git init` the first time, and prints the email the pull request's commit will carry. That commit is public on github.com/raycast/extensions, so if you do not want your personal address on it, set your GitHub noreply address in the staged repo first:

```sh
cd ~/src/redbison-raycast
git config user.email "<id>+<username>@users.noreply.github.com"
```

## 3. Take the store screenshots

Raycast wants up to six PNG screenshots at 2000 x 1250 (16:10), three or more recommended, all in one theme, nothing else on screen and no personal data. Raycast's own Capture Window command takes them at the right size and saves them into `metadata/` with the right names.

1. In ~/src/redbison-raycast: `npm run dev`. Raycast opens with the extension loaded in development mode.
2. In Raycast, search for **Capture Window**, assign it a hotkey, and turn on **Save to Metadata** in its settings.
3. Use the light theme and a plain desktop background, then for each shot below open the view and press the hotkey:
   1. **Run Utility** with `{"name":"RedBison","tools":759,"offline":true}` selected in a text editor, search bar empty, so the list shows the input size in the placeholder.
   2. The **Format JSON** result for that input, with the metadata panel on the right.
   3. **Hash the selection** (search `hash`), ⌘E for Run with Options, the Algorithm dropdown open.
   4. **Search Tools** with `mortgage` typed.
   5. **Search Tools** with the category dropdown open.
   6. **Insert UUID** (search `uuid`), Enter, showing the generated UUID.
4. Check the files: `ls metadata/` should list `redbison-1.png` to `redbison-6.png`, each `sips -g pixelWidth -g pixelHeight` 2000 x 1250.

Copy the `metadata/` folder back to `integrations/raycast/metadata/` in the RedBison repo so the next stage keeps it.

While `npm run dev` is running, try each command once in Raycast: the build has only been checked by `ray build`, `ray lint` and the unit tests, never opened in Raycast.

## 4. Publish

```sh
cd ~/src/redbison-raycast
npm run build && npm run lint
git add -A && git commit -m "RedBison extension"
npm run publish
```

`npm run publish` runs `ray publish`: it asks you to authorize GitHub in the browser, forks raycast/extensions to your account, and opens a draft pull request adding `extensions/redbison`. Then on GitHub:

- Fill in the PR template: a description, the screenshots or a short screencast, and tick the checklist.
- Say in the description why `src/vendor/` exists, as reviewers will ask: "src/vendor is the redbison CLI's own tool code, copied unchanged from the MIT-licensed github.com/redbison-dev/redbison-tools by scripts/sync.mjs so the extension needs no CLI installed; nothing in it calls a network."
- Mark the PR **Ready for review**.

Raycast reviews it, may ask for changes, and publishes to the Store on merge.

## Updating later

```sh
cd integrations/raycast
npm run sync        # copy the CLI's current tool code and the site catalogue
npm test && npm run build && npm run lint
# add an entry at the top of CHANGELOG.md: ## [What changed] - {PR_MERGE_DATE}
npm run stage -- ~/src/redbison-raycast
cd ~/src/redbison-raycast && npm ci && git add -A && git commit -m "Update RedBison extension" && npm run publish
```

If anyone else edits the extension in raycast/extensions, `npm run publish` refuses until you run `npm run pull` (`ray pull-contributions`) in the staged repo and copy those changes back here.

## Where things live

| Path | What it is |
| --- | --- |
| `src/search-tools.tsx` | Search Tools |
| `src/run-utility.tsx`, `src/components/` | Run Utility: the list, the options form, the result view |
| `src/format-clipboard-json.ts` | Format Clipboard JSON |
| `src/lib/utilities.ts` | Which CLI tools are offered and how a run is wired; no Raycast imports, so tests run it |
| `src/lib/site-tools.ts` | The site catalogue and its validation |
| `src/vendor/` | The CLI's code and the site catalogue, copied by `npm run sync`; never edit by hand |
| `test/` | Vitest: the shared 370-case behavior table, wiring, catalogue, and a byte-identity check against the main repo |
| `assets/icon.png` | 512 x 512, rendered from public/brand/redbison-mark.svg; red on transparent, legible in both themes |
