# QuickForce Tester Guide

Thanks for helping test QuickForce. This is a Raycast extension for Salesforce admins and developers. It lets you switch orgs, run SOQL, search records, jump to Setup pages, create records, and manage users from Raycast.

## Requirements

- macOS with [Raycast](https://raycast.com/) installed
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli)
- Node.js and npm
- At least one authenticated Salesforce org

Check your Salesforce CLI setup:

```bash
sf --version
sf org list auth
```

If that returns at least one org, QuickForce should be able to see it.

If you do not have an org authenticated yet:

```bash
sf org login web --alias quickforce-test
```

## Install From GitHub

Use whichever clone URL works for your GitHub access.

HTTPS:

```bash
git clone https://github.com/Kel-Antony/quickforce.git
cd quickforce
npm install
npm run dev
```

SSH:

```bash
git clone git@github.com:Kel-Antony/quickforce.git
cd quickforce
npm install
npm run dev
```

Raycast will open the extension in development mode. From Raycast, search for commands such as:

- Manage Salesforce Orgs
- Run SOQL Query
- Search Records
- Setup Quick Access
- Create Record
- Manage Users
- Org Limits in Menu Bar

## Suggested Test Flow

1. Open **Manage Salesforce Orgs** and confirm your authenticated orgs appear.
2. Open an org, Setup, and Developer Console.
3. Run a simple SOQL query:

   ```sql
   SELECT Id, Name FROM Account LIMIT 10
   ```

4. Search records using **Search Records**.
5. Create a test Lead, Task, or Account in a sandbox/dev org.
6. Try **Setup Quick Access** and pin one Setup page.
7. Try **Manage Users** in a sandbox/dev org if you have admin access.
8. Optional: enable **Org Limits in Menu Bar** and confirm limits appear for your default org.

## Safety Notes

- Prefer testing in a sandbox, scratch org, or dev org.
- **Create Record** writes real Salesforce records.
- **Manage Users** includes admin actions. Only use freeze/unfreeze, activate/deactivate, and reset password in an org where you are comfortable testing those actions.
- QuickForce currently uses a fast org-open bridge that briefly writes a local temporary HTML file containing a Salesforce session token. This is documented as a store-readiness item before wider release.

## Feedback Wanted

Please share:

- Did install work on the first try?
- Did QuickForce find your orgs?
- Which commands felt useful?
- Which commands felt confusing?
- Any errors, broken links, or slow screens?
- What would need to change before you used this daily?

Useful details in bug reports:

- macOS version
- Raycast version
- Salesforce CLI version: `sf --version`
- Which command failed
- Screenshot or short screen recording
- Error text from the Raycast toast, if any

## Quick Troubleshooting

If Raycast does not show the extension, make sure `npm run dev` is still running in the Salesforce extension folder.

If no orgs appear, run:

```bash
sf org list auth
```

If an org is missing or expired, log in again:

```bash
sf org login web --alias quickforce-test
```

If a command fails, copy the Raycast error text and run the same Salesforce CLI command in Terminal if one is shown.

## Feedback Template

```text
Name:
macOS version:
Raycast version:
Salesforce CLI version:
Org type tested: sandbox / scratch / dev / production

Install worked? yes / no
Commands tried:
Most useful command:
Most confusing command:
Bugs or errors:
Daily-driver wishlist:
```
