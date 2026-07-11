# Salesforce Workbench for Raycast

A Raycast extension for working with Salesforce orgs already authenticated through Salesforce CLI (`sf`). It supports live org selection, SOQL, SOSL record search, Setup navigation, record creation and editing, guarded deletion, CSV export, and encrypted local history.

## Setup

1. Install [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) and verify it with `sf --version`.
2. Open the extension preferences and set **Salesforce CLI Path** to the `sf` executable. The default is `/usr/local/bin/sf`.
3. Choose an **Export Directory** for SOQL CSV files.
4. Open **Salesforce Org Hub** and choose **Add Salesforce Org**. Select Production, sandbox, or a custom login URL and complete Salesforce's browser login.
5. Select the authenticated org in **Salesforce Org Hub** and choose **Set as Active Org**.

You can also authenticate before opening Raycast:

```bash
sf org login web --alias ExampleOrg --instance-url https://login.salesforce.com
sf org login web --alias ExampleSandbox --instance-url https://test.salesforce.com
```

Every configuration error screen includes **View Setup Guide** and **Open Extension Preferences**. Raycast also displays **About This Extension** during preference onboarding, which opens this README.

## Safety model

- Authentication and browser sessions stay with Salesforce CLI. The extension never requests or stores access tokens.
- Production is detected from Salesforce's `isSandbox` value, not from an alias name.
- Every Production create, update, or delete shows a preview and requires typing `PRODUCTION` exactly.
- Sandbox deletes require a destructive confirmation.
- Arbitrary REST calls, anonymous Apex, deployments, metadata changes, and bulk mutations are intentionally unavailable.

## Install from source

```bash
cd path/to/raycast-salesforce-workbench
npm install
npm test
npm run lint
npm run build
npm run dev
```

After `npm run dev` registers the extension, stop it with `Control-C`; the commands remain installed in Raycast.

## Commands

- **Salesforce Org Hub** — inspect live org status, select the active org, authenticate an org, and open Salesforce.
- **Run Salesforce SOQL** — run data or Tooling API queries, inspect up to 500 rows, save/rerun queries, and export full CSV results.
- **Search Salesforce Records** — debounced SOSL across Account, Contact, Lead, Opportunity, Case, and configured custom objects.
- **Create Salesforce Record** — create records with field-level metadata, picklists, required-field validation, and Production protection.
- **Open Salesforce** — open records by ID and common Setup destinations.
- **Salesforce Workbench History** — review or clear encrypted local query/result and mutation before/after history.

## Preferences

- Salesforce CLI path (default `/usr/local/bin/sf`)
- Export directory for SOQL CSV files
- History retention days and maximum combined entries
- Additional search objects using `Custom__c(Name,Status__c);Other__c(Name)` syntax
- Preferred browser

Raycast LocalStorage caps saved query snapshots at 500 rows and 2 MB per entry. The default retention is 30 days or 100 combined entries.

## Development verification

Automated tests never write to Production. Live CRUD acceptance should use a uniquely named disposable record in a sandbox and delete it after verification.
