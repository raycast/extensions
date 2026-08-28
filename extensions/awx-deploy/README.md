# AWX Deploy

Browse, launch, and monitor [AWX](https://github.com/ansible/awx) job templates straight from Raycast.

## Commands

- **Search Templates** — Server-side paginated, filterable list of workflows and job templates. Launch a selected template directly, launch it with custom extra variables (survey-aware), or view a workflow's stages.
- **Running Jobs** — Live view of currently running jobs (pending / waiting / running), auto-refreshing every few seconds. Open a job's output in AWX or cancel it.
- **Workflow History** — Workflow templates run in the last 7 days, grouped by template, with per-workflow and per-stage timing stats, success rates, and usage breakdowns.

## Setup

On first run Raycast will ask for two preferences:

| Preference | Description |
| ---------- | ----------- |
| **AWX URL** | Base URL of your AWX instance, e.g. `https://awx.example.com` |
| **API Token** | An AWX OAuth2 / personal access token, sent as a `Bearer` token |

Create a token in AWX under **Users → (your user) → Tokens**, with at least *read* scope (and *write* if you want to launch/cancel jobs).

## Development

```sh
pnpm install
pnpm dev      # ray develop
pnpm lint     # ray lint
pnpm build    # ray build
```

## Disclaimer

This is an unofficial, community-built extension. It is **not affiliated with, endorsed by, or sponsored by** AWX, the Ansible project, or Red Hat, Inc. "AWX" and "Ansible" are trademarks of Red Hat, Inc., used here only to describe what the extension interacts with.
