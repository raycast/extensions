# Starling for Raycast

Securely manage your Starling data in Raycast using **your own Personal Access Token**.

## Security Model

- No shared API key is used.
- Each user must create and save their own Starling personal token in extension preferences.
- The token is stored by Raycast as a password preference and never bundled in source.

## Commands

- `Dashboard`: account holder overview + balances for all accounts.
- `Transactions`: multi-account transaction browser with search and note update action.
- `Spaces`: list spending/savings spaces across accounts.
- `Payees`: inspect payees and linked payee accounts.
- `Cards`: inspect cards, lock/unlock card, and update card controls.
- `Direct Debit Mandates`: list mandates and cancel selected mandates.

## Setup

To access your own Starling account, create a Personal Access Token first:

1. Sign in to the [Starling Developer Portal](https://developer.starlingbank.com/login).
2. Open **Personal Access**.
3. Link your Starling Bank account to your Starling Developer account.
4. Create a new token and select all permissions except:
   - `payee:create`
   - `pay-local:create`
   - `standing-order:create`
5. Copy the token.
6. In Raycast, open the extension preferences and paste it into `Personal Access Token`.

## Suggested Scopes

Minimum read experience:

- `account:read`
- `account-list:read`
- `balance:read`
- `transaction:read`
- `space:read`
- `payee:read`
- `card:read`
- `mandate:read`

For edit actions in this extension:

- `transaction:edit` (update user note)
- `card-control:edit` (card controls)
- `mandate:delete` (cancel mandates)

## Notes

- Starling personal access tokens are rate-limited
- If a command returns no data, verify token scopes and environment.

## Demo Mode

- In extension preferences, enable `Use Demo Data` to load fictional sample data.
- Demo mode skips live Starling API calls