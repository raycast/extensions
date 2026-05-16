# PostHog

Search insights, dashboards, errors, experiments, surveys, feature flags, cohorts, and persons in your PostHog project — and put PostHog at the fingertips of Raycast AI.

## Commands

- **Insights**, **Dashboards**, **Errors**, **Experiments**, **Surveys**, **Feature Flags**, **Cohorts**, **Projects** — browse and open.
- **Search Persons**, **Search Events** — keyword search with arguments.

## Raycast AI

Mention `@posthog` in Raycast AI Chat, Quick AI, or root search to use the extension as a tool layer. Common asks:

- "@posthog what are my active feature flags"
- "@posthog show me errors from today"
- "@posthog what's our DAU this week" (generates HogQL, runs it)
- "@posthog disable the new-checkout flag" (confirms before applying)
- "@posthog summarize survey responses for onboarding-v2"

The full tool set mirrors the official [PostHog MCP server](https://github.com/PostHog/mcp). Destructive operations require confirmation.

## Configuring a Personal Access Token

You need a personal access token instead of logging in through OAuth to authenticate your PostHog requests:

1. Go to https://app.posthog.com/me/settings (or https://eu.posthog.com/me/settings)
2. Click "Create personal API key"
3. Call it "Raycast" or anything you like.
4. Click "Create key".
5. Copy the token in the "Personal API Key" field in the extension's preferences.

## Required API Key Scopes

Pick the smallest set that covers what you actually use.

Recommended for the AI tools to work end-to-end: **grant all reads + writes** so the AI doesn't hit a 403 mid-conversation. The scopes are:

- `organization:read`, `project:read` — required, the AI uses these to enumerate projects and orgs.
- `feature_flag:read`, `feature_flag:write`
- `dashboard:read`, `dashboard:write`
- `insight:read`, `insight:write`
- `experiment:read`, `experiment:write`
- `survey:read`, `survey:write`
- `error_tracking:read`, `error_tracking:write`
- `cohort:read`
- `person:read`
- `query:read` — required for `query-run` and any analytics-style question
- `warehouse_view:read` — optional, for data warehouse browsing

If you only want the read-only commands (the original five view commands), just `project:read`, `organization:read`, `feature_flag:read`, `cohort:read`, `dashboard:read`, `person:read` is enough.

The extension never sends data anywhere except your PostHog instance.

### Troubleshooting

**`HTTP 503` or `PostHog API 503` from `Get Projects` / `Switch Active Project`:** PostHog sometimes returns 503 (rather than a clean 403) when a *project-scoped* personal API key hits the organization-level `/api/projects/` listing endpoint. Recreate your key with **`organization:read`** scope (or "All access") and try again. The same applies to `Switch Organization`, which needs `organization:read`.

**`403 This action does not support personal API key access` from `query-generate-hogql-from-question`:** PostHog's Max AI generator endpoint isn't reachable with a personal API key. Workaround: ask the AI to write HogQL directly and call `query-run` with the `hogql` parameter — the AI is good at writing HogQL since it's just SQL.

**`HTTP 401` or `HTTP 403`:** your key is missing a required scope for the action. See the lists above.

**The "US" region option is the wrong host:** PostHog migrated US Cloud to `us.posthog.com`. Use that option in preferences. The old `app.posthog.com` is kept as "Legacy US" for accounts that haven't been migrated.
