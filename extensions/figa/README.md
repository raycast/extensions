# Figa — bill tracker and expense tracker

Keep recurring bills, subscriptions and one-time expenses in view without leaving your keyboard. [Figa](https://getfiga.com/) helps you plan upcoming costs and track what is paid, without connecting a bank account.

## What you can do

- **Search Expenses** — find this month's expenses, filter paid or unpaid bills, and open an expense in Figa. Estimates, unknown amounts and payment windows stay clearly labeled. Assigned tags appear beside expenses and can be searched by name.
- **Show Monthly Summary** — see seven months of known totals, estimates, paid amounts and confirmed unpaid bills in the workspace currency. Copy the current month's summary for your partner or team with a small “Prepared with Figa” link. Copying only puts text on your clipboard; nothing is sent automatically.
- **Create Expense** — add a one-time expense with an amount, currency, date, category and optional recipient, existing workspace tags or note.
- **Mark Expense Paid** — confirm a selected expense's payment status. For variable bills, confirm the actual amount in Figa first.
- **Search Categories / Search Recipients** — look up your workspace's references and open them in Figa.
- **Search Tags** — find workspace tags, copy their names or IDs, and open them in Figa. Requires `tags.read` on the API key.
- **Show Workspace Context** — check the connected workspace, plan and key permissions.

For recurring schedules, forecast settings, service calculations and other detailed edits, use **Open Expense in Figa**.

## Get started

1. [Create a Figa account](https://app.figa.cc/) or sign in, then open your workspace's **Settings → API keys**.
2. Create a dedicated key for Raycast. Choose **read** to browse, or **write** to create expenses and change payment status.
3. Paste the key into the extension's **API Key** password preference.
4. Run **Show Workspace Context** to verify the connection.

Free includes one shared API key or MCP connection slot per organization and access to the oldest 20 expenses per month across that organization. Pro removes these limits. Summaries indicate when plan limits hide expenses; unknown amounts are never treated as zero-valued bills. See [current plans](https://getfiga.com/pricing/).

Each key connects one workspace. To switch workspaces, replace the key in extension preferences. Keep it private and revoke it in Figa if it is exposed.

## Help and privacy

- [Raycast setup guide](https://getfiga.com/help/developers/integrations/raycast/)
- [Explore Figa for Raycast](https://getfiga.com/integrations/raycast/)
- [Privacy policy](https://getfiga.com/privacy-policy/)

Your key is stored as a Raycast password preference. Commands communicate with Figa's API. The copied month summary contains amounts and a public Figa link, without your workspace name, workspace ID or API key. Review it before sharing.

## Local development

With Node.js 24 LTS (minimum 22.22.2) and Raycast installed, run `npm ci`, `npm test`, `npm run lint`, and `npm run build` in this directory. Use `npm run dev` to load the extension locally. Run `npm run lint:store` and check the distribution build in Raycast before submitting an update to the Store.
