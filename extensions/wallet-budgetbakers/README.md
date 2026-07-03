# Wallet by BudgetBakers

Raycast extension to manage your [Wallet by BudgetBakers](https://budgetbakers.com) finances using the official [Wallet REST API](https://rest.budgetbakers.com/wallet/reference).

## Commands

| Command | Description |
|---|---|
| **Dashboard** | Monthly overview: expenses, income, balance, month-over-month trend, account balances, top spending categories and latest records. Press `⌘G` for a charts view with 6 months of history. |
| **Search Records** | Search by note, payee, category or account, filter by period. Edit (`↵`), add (`⌘N`) and delete (`⌃X`) records. |
| **Add Record** | Add an expense or income with amount, account, category, date, payment type, payee, note and labels. |
| **Accounts** | Account balances; create, rename and archive/unarchive accounts. |
| **Budgets** | Budgets with limit and progress; create new budgets. |

## Setup

1. A Wallet **Premium plan** is required to use the API.
2. Generate your API token in the Wallet **web app** settings.
3. The first time you run a command, Raycast will ask for the **API Token**. It is stored securely in the extension preferences.

## Notes

- The API is rate-limited to **300 requests/hour**.
- Records on bank-synced accounts have locked fields (date, amount, state) and cannot be deleted through the API. Uncleared bank-synced records cannot be modified at all until the bank settles them.
- The system categories Debt, Transfer, Shopping List and Uncategorized cannot be assigned to records (API restriction).
- Accounts cannot be deleted through the API, only archived.
