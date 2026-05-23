# Jei-sKappa Skills (Raycast)

Raycast extension that turns the [`Jei-sKappa/skills`](../skills) collection into a one-shot clipboard tool.

## Why use it

It is not only for the obvious case (an agent harness that does not know how to load `SKILL.md`). The same wrap-and-copy flow is the better default whenever you want:

- **No bulk install.** The catalog is large and still growing. Instead of `npx skills add …` for every skill you might one day need (and lugging them around in every harness's skill index), keep the source of truth here and pull only the skill you actually need, when you need it.
- **Maximum control over which skill runs.** A harness that auto-routes on skill descriptions can pick a skill you did not intend. Wrapping a skill into a copied prompt makes skills strictly opt-in: nothing fires until *you* paste it.
- **Cross-harness portability.** Works with any chat-style agent — including ones that have no skill concept at all — because the output is just a wrapped instruction plus your prompt.

## What it does

Run **Select Skill** to:

1. Browse the searchable list of skills (sectioned by workflow group, deprecated at the bottom). Skills that have a `references/` folder are marked with a paperclip accessory showing the file count.
2. Preview the skill body in the Detail panel. If references exist, they are appended to the preview under an **Inlined references** heading.
3. Hit `↵` to open a form, paste in the prompt you want to send the agent, and submit.
4. The combined output lands on your clipboard, ready to paste into any chat-style agent:

```
<instruction>
<references>
<reference path="references/foo.md">…file contents…</reference>
<reference path="references/bar.md">…file contents…</reference>
</references>

…skill body, frontmatter stripped…
</instruction>

…your prompt…
```

References sit *inside* `<instruction>`, at the top, so the long static documents are above the skill body and the user prompt is at the bottom — the layout LLMs handle best (recent tokens are weighted highest for "what to do next").

If you do not need to attach a prompt, the `⌘⏎` shortcut on the list copies just the wrapped instruction. For skills with references, `⌘⌥⏎` copies a slimmer variant with the `<references>` block omitted (use it when you want a short instruction and will supply context yourself).

## Source of truth

The skill bodies are NOT edited inside this folder. They are generated from `../skills/**/SKILL.md` into `assets/skills.json` by `scripts/sync-skills-to-raycast.mjs`.

To pick up new or edited skills:

```sh
# from this folder
npm run sync

# or directly
node scripts/sync-skills-to-raycast.mjs
```

The script:

- reads every `skills/**/SKILL.md`
- strips the YAML frontmatter (keeps `description` and `metadata.version` as metadata fields)
- derives a Title-Case display name and a group label from the file's path
- walks each skill's `references/` folder (if any) and embeds each file's contents into the manifest so the wrapped output stays self-contained
- writes everything into `assets/skills.json`, which the command reads via `environment.assetsPath` at runtime

## Local development

```sh
npm install
npm run dev
```

`npm run dev` starts Raycast in development mode and registers the **Select Skill** command. Keep it running while iterating on `src/select-skill.tsx`.

## Icon

`assets/icon.png` is a 512×512 PNG. Drop in a different one with the same path and filename to swap it.
