# moon-mansions

Raycast extension: moon phase + illumination % + tropical zodiac + Abu Ma'shar 28 lunar mansion (Manazil al-Qamar).

## Stack
TypeScript + `@raycast/api`. Zero runtime astro deps — math ported from `28LunarMansionGuide/index.html` (Meeus Ch.47 truncation, ±1–2°, cross-checked vs AstroSeek).

## Run
`npm install && npm run dev`, then search Raycast for "Moon".

After every src edit: `npm run build` (`ray build -e dist`) rebuilds and installs straight into
`~/.config/raycast/extensions/moon-mansions/`. Verified 2026-09-25: no `ray develop` process
running, installed bundle still refreshed — so `ray develop` is not required. Then re-open the
menu-bar dropdown; it caches on its `1h` interval.

## Key files
- `src/moon.ts` — `moonLon`, `sunLon`, phase + waxing/waning `trend`, zodiac, `lonToMansion`, MANSIONS data. Do not retune constants without cross-validating 3 dates vs Stellarium/AstroSeek.
- `src/systems.ts` — generated Vedic/Chinese lookups. Regenerate from IbnArbi data, never hand-edit.
- `src/info.tsx` — Detail view command.
- `src/menu-bar.tsx` — menu-bar command (`interval: 1h`).

## Compliance checklist (global AGENTS.md, applied every session without prompting)
- [ ] Read file + grep callers before changing behavior
- [ ] Edit only the block needing change; show modified snippet only
- [ ] User decisions as multichoice popup (2–5 options), never prose
- [ ] Complex work: 2–4 bullet plan, then execute; pause only on irreversible steps
- [ ] After Read: one-sentence finding. After Bash: key result. After Write/Edit: filename
- [ ] Distinguish implemented ≠ verified ≠ tested; verify by execution
- [ ] No AI slop, no banned phrases, no emojis in chat
- [ ] Ask one precise question when in doubt; act without asking when sure
- [ ] End with single one-liner status
