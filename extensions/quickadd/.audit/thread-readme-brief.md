# Thread: the README

Read `/Users/christian/Developer/raycast-quickadd/.audit/shared-setup.md` first (environment, the shared Raycast build rule, the keystroke guard script, user rules, how to finish). Branch `readme`.

## Goal

Rewrite `README.md` into the page a stranger lands on from GitHub or the Raycast store and immediately wants to install. This is also the user's preparation for submitting to the Raycast store, so it has to be true to the code on `main`, look professional at every pixel, and read like a person wrote it. It is the first impression of an extension written by the author of QuickAdd itself; the current README reads like internal notes.

## What "amazing" means here

- **A hero.** A wide hero image at the top (the extension in action, in Raycast's real chrome, dark theme), and an animated GIF right under the headline showing the core loop: open Raycast, pick a choice, answer a form with a `[[` link pick, see the "Added to" toast, note appears in Obsidian. If recording a GIF on this machine proves impossible, use three stills in a row and say so; never fake one.
- **A pitch in two sentences** above the fold: what it does and why it is different (official, from the QuickAdd author; drives the real plugin through Obsidian's CLI so every choice you already have works; nothing re-implemented).
- **Feature sections, each with a picture.** Run any choice with native forms; `[[` and `#` completion; Quick Capture, Capture Selection, Capture Clipboard; pin as Quicklink, with and without an inline argument (hotkeys!); vault detection and launching Obsidian; Cancel and honest finish messages; "Run in Obsidian" escape hatch. One tight paragraph each, screenshot beside or below. Every claim must match the code; read `src/` and `ARCHITECTURE.md` before writing.
- **Install** with a Raycast store badge placeholder (the store URL will be `https://www.raycast.com/christian_bager_bach_houmann/quickadd`; render the badge but mark it "coming soon" until published) and the from-source path.
- **Requirements** table (keep the existing facts, make it pretty), **Commands** reference, **Preferences**, **Tips** (hotkeys, Quicklinks with arguments, multi-line captures via `|type:multiline`), **Limitations** (honest: Templater's own prompts open in Obsidian; `{{selected}}` reads Obsidian's editor, use Capture Selection for the Mac selection), **How it works** (three sentences and a link to ARCHITECTURE.md), **Development** (the gates, the e2e vault, the protocol script), **License**.
- **Craft.** Consistent screenshot framing (same window size, same background, dark Raycast theme), alt text on every image, no walls of text, headings that say something, tables only where they beat prose, GitHub-flavored markdown that renders on GitHub AND in the Raycast store's README view (test both: GitHub via `gh` preview or a push to the branch, the store view renders a subset of markdown, so no HTML tricks the store strips; images must be relative paths inside the repo, under `media/`). Keep the badges to the ones that are true (CI status, license, Raycast store). No emoji in headings.

## Pictures

The e2e vault's fixtures are named like test cases ("Capture text", "Capture color"), which look bad in a README. Build a small **demo vault** for pictures only: `demo-vault/` committed in the repo (notes about a believable person's life: a few project notes, people, a reading list, daily notes, tags), with QuickAdd choices that look real: "Journal", "Add Book", "Meeting Notes" (with a person picker and tags, like the e2e meeting choice), "Quick Capture", "New Project". Copy `e2e-vault/.obsidian/plugins/quickadd/data.json` as the starting point and rename/reshape; keep the plugin bundle out of git the same way `.gitignore` does for the e2e vault. Register it in Obsidian under the name `demo-vault` using the IPC method in the shared setup (vault-open through `obsidian vault=dev eval`), enable community plugins and QuickAdd there the way the setup describes, and install the 2.31.0 bundle from `gh release download 2.31.0 -R chhoumann/quickadd -p main.js -p styles.css -p manifest.json`. You have full authority over `demo-vault` as well as `e2e-vault`. Drive the extension against it with deeplinks carrying `vaultPath` to the demo vault. Capture with `screencapture -R` on the Raycast window bounds (read them through CGWindowList like `/tmp/raycast-guard.sh` does), 2x retina, then compose onto a consistent background with a small Swift script (an earlier worker's `/tmp/pr4/frame.swift` may still exist as a starting point). For the GIF: `screencapture -v` records video to a file; convert with `ffmpeg` if installed (`which ffmpeg gifski`); if neither tool exists, say so and ship stills.

Also refresh the three store screenshots in `metadata/` from the demo vault so they match the README (same 2000x1250 size; `ray lint` validates them).

## Writing

Apply the `pstack:technical-writing` skill for structure and sentences, then `pstack:unslop` and `write-human` over the whole file. No em dashes anywhere (user rule). Short sentences. No "seamlessly", "effortlessly", "supercharge". Name the author of QuickAdd as the author of this extension once, plainly.

## Verification

- `pnpm lint` (validates README-adjacent manifest and the metadata images), `pnpm test`, `tsc`, `pnpm build` green.
- Push the branch and look at the rendered README on GitHub (`gh browse` is not viewable by you; fetch the rendered HTML via `gh api repos/chhoumann/raycast-quickadd/readme -H "Accept: application/vnd.github.html" --jq .` on your branch ref and sanity check image links resolve: `curl -sI` each raw image URL on your branch).
- Inspect every image you ship with the Read tool and describe it in the report; confirm consistent sizes with `sips -g pixelWidth -g pixelHeight`.
- Every feature claim in the README maps to a file in `src/`; list the mapping in the PR body.

## Finish

PR against `main` (not draft), title `docs(readme): rewrite the README for the store`, CI green, do not merge. Report: PR URL, the images and GIF paths with what each shows, what could not be done, the keystroke window, and that main's dev build was restored in Raycast. Leave `demo-vault` registered and open in Obsidian.
