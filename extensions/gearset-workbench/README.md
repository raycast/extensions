# Gearset Workbench for Raycast

A Raycast extension for supported Gearset CI, Reporting, and Audit API workflows.

## Setup

1. In Gearset, open **My account → Team Management → Access Control → Access token management**.
2. Create a scoped token for each API you plan to use:
   - **Automation API** for CI status, runs, and cancellation.
   - **Reporting API** for pipeline deployment reports.
   - **Audit API** for team deployment history and audit reports.
3. Open the Raycast extension preferences and paste each raw secret into its matching masked token field. Do not add the word `token`; the extension adds the authorization prefix.
4. For CI commands, add jobs using `Name|Job UUID|sandbox` or `Name|Job UUID|production`. Copy each UUID from the Gearset CI dashboard.
5. For pipeline reports, copy the pipeline UUID from its Gearset URL into **Default Pipeline ID**.

Every missing-configuration and error screen includes **View Setup Guide** and **Open Extension Preferences**. Raycast also displays **About This Extension** during preference onboarding, which opens this README.

## Commands

- **Gearset CI Jobs** checks the live status of configured CI jobs, opens a guarded run form, and can cancel a running job.
- **Gearset Raycast Run Requests** stores and refreshes CI run requests made from Raycast.
- **Gearset Team Deployment History** loads every deployment visible to the configured Audit API token, groups it into one searchable team view, and opens the selected deployment with **Enter**.
- **Gearset Pipeline Report** loads pipeline environments and Reporting API v3 deployments for a selected date range.
- **Gearset Audit** reads deployment, CI, pipeline, permission, delegation, role, and connected-service audit data.
- **Open Gearset** opens common Gearset destinations and the official API documentation.
- **Gearset Compare & Deploy** is a no-view quick link that immediately opens a new authenticated comparison.

## Requirements

- Raycast for macOS.
- Gearset API access tokens created under **Team Management → Access Control → Access token management**.
- The Gearset license and token scopes required for each API:
  - Automation API for CI status and run requests.
  - Reporting API v3 for pipeline deployments.
  - Audit API for audit reports.

Gearset permissions and license checks remain authoritative. The extension shows Gearset's returned error instead of attempting to bypass it.

## Configuration

Open the extension preferences and set:

1. Add the separate masked **Automation API Token**, **Reporting API Token**, and **Audit API Token** preferences for the commands you use. Each token is sent only to the fixed `https://api.gearset.com` origin in an `Authorization: token …` header. Tokens are never logged, copied into URLs, or stored in history.
2. **Configured CI Jobs** — separate jobs with semicolons:

   ```text
   Example Sandbox|11111111-1111-4111-8111-111111111111|sandbox;Example Production|22222222-2222-4222-8222-222222222222|production
   ```

3. **Default Pipeline ID** — optional; copy it from the Gearset pipeline URL.
4. Run-history retention, defaulting to 30 days and 100 entries.
5. Team deployment history range, defaulting to 30 days and capped at 90 days per request.

Gearset does not expose an endpoint that lists every CI job through the Automation API, so job IDs are configured explicitly. Copy a job ID from its Gearset CI dashboard menu.

Team Deployment History is read-only and reflects what the Audit API token's Gearset user is permitted to see. The Audit API requires an eligible Automation license and team permissions. **Enter** opens the selected deployment in Gearset; it does not re-run or mutate the deployment.

## Safety

- API calls are restricted to documented `/public/automation`, `/public/reporting`, `/public/operation`, and `/public/audit` endpoints at `api.gearset.com`.
- Production jobs show red badges and require typing `RUN PRODUCTION` exactly before every run request.
- Sandbox runs require a confirmation dialog.
- CI cancellation always requires a destructive confirmation.
- The extension does not implement pipeline promotion, deployment rollback, package mutation, arbitrary REST, or anonymous Apex.
- Run history contains IDs, state, timestamps, environment classification, and an optional commit override; it never contains the API token.

## Development

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
npm run dev
```

## Official API references

- [Automation API](https://api.gearset.com/public/automation/docs/index.html)
- [Reporting API](https://api.gearset.com/public/reporting/docs/index.html)
- [Audit API](https://api.gearset.com/public/audit/docs/index.html)
- [Creating a Gearset API access token](https://docs.gearset.com/en/articles/6099550-creating-a-gearset-api-access-token)
