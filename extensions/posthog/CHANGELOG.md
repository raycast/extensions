# PostHog Changelog

## [AI Tools, New Commands, and Modernization] - {PR_MERGE_DATE}

### Raycast AI tools (44)

The PostHog extension is now an AI Extension. Mention `@posthog` in Raycast AI Chat, Quick AI, or root search and Claude/GPT can browse dashboards, query data, manage feature flags, triage errors, run experiments, and more. The tool set mirrors the official [PostHog MCP server](https://github.com/PostHog/mcp) — definitions are vendored from [`schema/tool-definitions.json`](https://github.com/PostHog/mcp/blob/main/schema/tool-definitions.json) and the AI evaluation block in `package.json` covers the highest-traffic flows.

- Product analytics: `query-run`, `query-generate-hogql-from-question`, `event-definitions-list`, `properties-list`, `property-definitions`.
- Insights: `insights-get-all`, `insight-get`, `insight-query`, `insight-create-from-query`, `insight-update`, `insight-delete`.
- Dashboards: `dashboards-get-all`, `dashboard-get`, `dashboard-create`, `dashboard-update`, `dashboard-delete`, `add-insight-to-dashboard`.
- Feature flags: `feature-flag-get-all`, `feature-flag-get-definition`, `create-feature-flag`, `update-feature-flag`, `delete-feature-flag`.
- Error tracking: `list-errors`, `error-details`.
- Experiments: `experiment-get-all`, `experiment-get`, `experiment-create`, `experiment-update`, `experiment-results-get`, `experiment-delete`.
- Surveys: `surveys-get-all`, `survey-get`, `survey-create`, `survey-update`, `survey-delete`, `survey-stats`, `surveys-global-stats`.
- LLM analytics: `get-llm-total-costs-for-project`.
- Docs: `docs-search`.
- Workspace: `organizations-get`, `organization-details-get`, `switch-organization`, `projects-get`, `switch-project`.

Destructive operations (`*-delete`) and lifecycle operations (`switch-*`, updates) use `Tool.Confirmation` to keep humans in the loop. The active project/organization is persisted in `LocalStorage`.

### New view commands

- **Insights** — search saved insights and open them in the web app.
- **Errors** — browse active error-tracking issues.
- **Experiments** — list experiments with status (Draft/Running/Complete/Archived).
- **Surveys** — list surveys with status.
- **Search Events** — search event definitions in the active project.

### Modernized foundation

- Update `@raycast/api`, `@raycast/utils`, TypeScript 5, ESLint 9 (`eslint.config.js`), Prettier 3.
- Drop `axios`; switch to the native `fetch` client.
- Refactor each command onto a shared `src/api/` layer and `useCachedPromise`.
- Friendlier failure surfacing via `showFailureToast` everywhere.
- Add `us.posthog.com` as the default US region (PostHog migrated from `app.posthog.com`); keep the old host as "Legacy US" for accounts that haven't been migrated.
- API client now always sends trailing slashes (PostHog/DRF expects them on writes) and includes the failing URL + status text in error messages.
- `Get Projects` and `Switch Active Project` AI tools gracefully degrade for project-scoped personal API keys — they fall back to the user-scoped `/api/users/@me/` endpoint and surface a clear message if even that fails.

## [Initial Version] - 2023-06-30

- API key setup
- Open the web app
- Search feature flags, cohorts, dashboards, persons & projects
- Screenshots & documentation
