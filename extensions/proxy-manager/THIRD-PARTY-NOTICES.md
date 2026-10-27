# NOTICE — third-party material

## `.agents/skills/raycast-extension/references/*` and this skill's structure

- **Source:** [adriangrantdotorg/Raycast-AI-Skill](https://github.com/adriangrantdotorg/Raycast-AI-Skill),
  skill `raycast`, snapshot of 2026-10-19 (API 2.8.2).
- **License:** Apache License 2.0 — a copy is in
  `.agents/skills/raycast-extension/LICENSE`.
- **What was taken:** the four `references/*.md` files and `FRESHNESS.json`,
  verbatim, plus the general shape of the skill (reference-file map,
  rules-vs-lookups split).
- **What was changed:** `SKILL.md` was rewritten for this repository: it pins
  `@raycast/api` 1.104 instead of 2.x, uses bun, drops the Script Command and
  AI-extension material that this project does not use, and adds the local
  project rules. `references/raycast-v1-support.md` is new and overrides the
  upstream files wherever they describe an API added in 2.0. File names under
  `references/` were kept identical so the upstream diff stays readable.
- **Evaluated alternatives:** `johnlindquist/claude` → `skills/raycast-extension`
  (MIT, ~15 KB, single file, API 1.83-era, strong on caching/performance but no
  manifest or hook reference), and the various "Raycast skill" listings on
  skillselion / mcpmarket / skillsdirectory, which are repackagings of the same
  material without a public source repository. The Adrian Grant skill was chosen
  because it is versioned, dated, Apache-2.0, and carries per-prop references
  distilled from developers.raycast.com.

## Icon

`assets/extension-icon.png` is ProxyManager's own app icon, derived by
`scripts/make-icon.swift` from the artwork produced by
`Tools/AppIcon/main.swift` in the ProxyManager repository: the transparent
margin is trimmed and the squircle is scaled to 512×512. No third-party artwork.

## Everything else

MIT — see `LICENSE`.
