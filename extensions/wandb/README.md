# Weights & Biases for Raycast

Browse your W&B **entities → projects → runs** from Raycast and jump straight into them.

![icon](assets/extension-icon.png)

## Features

- **GUI sign-in** — the extension prompts you in-app: open `wandb.ai/authorize`, paste your key, and it's validated and stored in Raycast's encrypted storage. If you've already run `wandb login`, the key is picked up from `~/.netrc` automatically (no prompt).
- **Multiple accounts** — add several W&B accounts (`⌘N`). The top-right dropdown lists every account's entities, grouped by account (e.g. `@scomble13`, `@your-liquid-ai-account`), so personal and org work live side by side. Remove the current account with `⌘⇧X`.
- **Entity switcher** — pick your team/user from the top-right dropdown (like the GitHub extension's org picker).
- **Project list** — most-recently-active first; `Enter` drills into runs, or open the project in the browser.
- **Run drill-in** — runs with state (running / finished / crashed) shown as colored icons; open any run or copy its URL.

## Develop

```bash
npm install
npm run dev      # loads the extension into the Raycast app (hot reload)
npm run build    # typecheck + bundle
npm test         # unit tests (netrc parser, URL/auth helpers)
```

`npm run dev` requires the Raycast macOS app to be running and signed in.

## Architecture

| File | Responsibility |
|------|----------------|
| `src/wandb.ts` | Thin GraphQL client (`viewer`, `projects`, `runs`) + URL/auth helpers |
| `src/netrc.ts` | Parse `~/.netrc` for the `api.wandb.ai` key |
| `src/accounts.ts` | Multi-account store (LocalStorage), validate/add/remove, netrc+legacy bootstrap |
| `src/auth-form.tsx` | In-app GUI sign-in form (validate + persist) |
| `src/search-wandb.tsx` | Command entry — account gate → project list |
| `src/project-list.tsx` | Account/entity dropdown + project list |
| `src/run-list.tsx` | Run drill-in view |

Auth is HTTP Basic against `https://api.wandb.ai/graphql` (`api:<key>`).
