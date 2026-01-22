# Skills Directory (Raycast)

Search skills from skills.sh and install them via the `skills` CLI.

Repository: https://github.com/techczech/skills-sh-search-raycast

## Features
- Fetches the skills leaderboard from skills.sh
- Filters by skill name or repo
- Installs with `npx skills add <owner/repo>`
- Optional no-telemetry install (`SKILLS_NO_TELEMETRY=1`)
- Optional extraction script to dump the leaderboard to JSON

## CLI reference
```bash
npx skills add <skill-name>
```

Install by owner/repo:
```bash
npx skills add vercel-labs/agent-skills
```

Opt out of telemetry:
```bash
SKILLS_NO_TELEMETRY=1 npx skills add vercel-labs/agent-skills
```

## Extract the leaderboard
```bash
npm run extract -- skills-leaderboard.json
```
