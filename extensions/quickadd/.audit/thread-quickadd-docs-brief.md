# Thread (QuickAdd docs): a page for the Raycast extension

Repo `chhoumann/quickadd` at `/Users/christian/Developer/quickadd`. Read `AGENTS.md` first; its Documentation section says how the Astro Starlight docs site works (pages under `docs/src/content/docs/docs/`, `slug:` frontmatter pins the URL, sidebar in `docs/astro.config.mjs`, deployed to quickadd.obsidian.guide on merge to master). pnpm binary on this machine: `~/.vite-plus/package_manager/pnpm/10.32.1/pnpm/bin/pnpm` (the shim is blocked). Branch `docs/raycast-extension` in your own worktree.

## Goal

A documentation page that tells a QuickAdd user what the Raycast extension does, how to install it, and how to make the most of it, written to the standard of the rest of the site. It is the user-facing counterpart of the extension's README, not a copy of it: the README sells and the docs page teaches. QuickAdd's author wrote the extension, so this page is first-party.

## Facts (verify each against the extension's code at `/Users/christian/Developer/raycast-quickadd`, branch `main`, and its `README.md` and `ARCHITECTURE.md`; a separate agent is rewriting that README on branch `readme` right now, so read `main`)

- Commands: Run QuickAdd Choice (browse, run, answer prompts in Raycast, Recent section, Run in Obsidian), Quick Capture (text argument), Capture Selection, Capture Clipboard; Pin as Quicklink and Pin as Quicklink with Argument (the argument becomes `{{VALUE}}`).
- Forms: every prompt QuickAdd raises is rendered natively (one-page forms, suggesters, multi-select, dates with time, checkboxes, confirms, info, script `requestInputs`); `[[` and `#` completion in text fields comes from QuickAdd's `quickadd:suggest`; note pickers start empty.
- Vaults: found from Obsidian's vault list; a picker when several have QuickAdd; opens Obsidian or the vault when closed; the Vault preference overrides.
- Requirements: macOS; Obsidian 1.12 installer or later with the CLI turned on (Settings → General → Command line interface); QuickAdd minimums per feature (2.15 captures, 2.17.2 forms, 2.20 cancel and finish messages, 2.31 note pickers and completion). The extension is not in the Raycast store yet: install from source (`git clone`, `pnpm install`, `pnpm dev`). Write it so a store link can replace the source steps later (one sentence, one link).
- Limitations: Templater's own prompts open in Obsidian; `{{selected}}` inside a choice reads Obsidian's editor (Capture Selection covers the Mac selection); Escape aborts the run since QuickAdd 2.31.

## Shape

One new page `docs/src/content/docs/docs/Advanced/RaycastExtension.md` with `title`, `description`, and `slug: docs/Advanced/RaycastExtension` frontmatter, following the voice and structure of `TriggerQuickAddFromOutsideObsidian.md` and `CLI.md` (read both in full). Sections: what it is in two sentences; Install; Run a choice; Capture from anywhere (the three capture commands); Hotkeys and Quicklinks (with the argument form); Multiple vaults; Requirements table; Limitations; Troubleshooting (CLI not enabled, vault name conflicts, "needs QuickAdd 2.31" message). Keep it a how-to, Diátaxis style (the `t3-pstack:technical-writing` skill, then `t3-pstack:unslop`). No em dashes (user rule). Headings carry `{#anchors}` like the neighbours.

Sidebar: add `{ label: "Raycast Extension", slug: "docs/Advanced/RaycastExtension" }` in `docs/astro.config.mjs` right after "Trigger QuickAdd from outside Obsidian". Cross-links: one sentence plus link in the desktop-shortcuts section of `TriggerQuickAddFromOutsideObsidian.md` and one in `CLI.md`'s intro pointing to the new page (do not restructure those pages). `docs/public/_redirects` needs nothing since the slug is new.

Pictures: two or three, in `docs/src/content/docs/docs/Images/` next to the existing ones (check how neighbouring pages reference images and match it). Use the extension's committed store screenshots at `/Users/christian/Developer/raycast-quickadd/metadata/quickadd-1.png` to `-3.png` (2000x1250) scaled to the width the site uses for screenshots; do not capture new ones. If the `readme` branch of the extension already has nicer images under `media/` when you get there (`git -C /Users/christian/Developer/raycast-quickadd show readme --stat`), prefer those and say which you used.

## Verification

- `pnpm install` then `pnpm run docs:build` or the equivalent script in `docs/package.json` (read it) must pass; fix any broken link the build reports.
- Open the built page: run the docs dev server or `pnpm run preview` under `docs/`, fetch the page with `curl` and check the headings and image URLs resolve (HTTP 200 for each image). Screenshot the rendered page through the T3 preview tools if available (`preview_navigate` to the local docs port, `preview_snapshot` with `save: true`), inspect it, and attach the path in the report.
- Every claim on the page maps to a feature in the extension's `src/`; list the mapping in the PR body.

## Finish

Push, open a PR against `master` (not draft) with `gh pr create`, title `docs: add a page for the Raycast extension`, body Why / What changed / Scope / Verification, no em dashes. Confirm the required checks pass (`gh pr checks`); the Cloudflare Pages preview is informational, read its URL from the PR comments and fetch the new page from the preview to confirm it renders. Triage any bot comment on its merits. Do not merge. Report: PR URL, preview URL of the new page, the screenshot path, and anything not verified.
