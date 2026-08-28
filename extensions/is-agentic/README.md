# Is Agentic

View a website's completed [Is Agentic](https://is-agentic.com) report directly in Raycast. Inspect its score, failed or partial checks, evidence, and recommendations for making the site easier for AI agents to use.

## Commands

### Check Agent Readiness

Enter a public website URL to retrieve its latest completed Is Agentic report. The command shows the overall score, issue tiers, and individual evidence and recommendations. It does not start or wait for a scan; if no report exists, use the provided action to start one on is-agentic.com, then retry once it completes.

### View Report History

Browse the 25 most recently viewed reports. History is stored locally in Raycast and can be searched, removed one entry at a time, or cleared entirely.

## Raycast AI

On macOS with Raycast AI enabled, mention `@is-agentic` in AI Chat, Quick AI, or an AI Command to use either of these read-only tools:

- **Get Agent Readiness Report** — retrieves the latest completed report for one public URL.
- **Compare Agent Readiness** — compares the latest completed reports for two public URLs.

The tools do not start, refresh, or modify scans. If a report is unavailable, start a scan on [Is Agentic](https://is-agentic.com) and try again after completion.

## Development

```bash
npm install
npm run dev
```

Run the checks before publishing:

```bash
npm run lint
npx tsc --noEmit
npm run build
npx ray evals
```
