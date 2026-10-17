# Budget API exploration

## Goal

Determine whether Moneytree's *existing category budgets* can be read and modified from this Raycast extension. The user has approved reversible tests on a real budget; avoid changing the two existing limits.

## Established

- Source checkout: https://github.com/clins1994/raycast-moneytree. `npm ci --ignore-scripts --no-audit --no-fund`, `npm run lint`, and `npm run build` pass on the cloned main branch.
- The original extension supported account, credential, transaction, and category API calls but no budget calls. A read-only `get-budgets` tool, create/update/delete budget AI tools, and a `list-budgets` command with forms/actions have been added to the local checkout. The user ran `List Budgets` against the signed-in account and supplied a screenshot showing two category budgets; this verifies GET `budgets.json` works with the extension's existing API base and authentication. API base and request headers are in `src/lib/constants.ts` and `src/lib/api.ts`. Auth is managed in `src/lib/auth.ts`; never export its stored values.
- The public web app bundle at `https://app.getmoneytree.com/scripts/scripts.ee3aed3e.js` describes "Budget by Category" as available in the mobile app (iOS & Android) only. No budget API routes were identified in the two public bundles inspected. This does **not** establish that the mobile app lacks a backend endpoint.
- Moneytree's FAQ says budget notifications are calculated after transactions are fetched locally, so a server-side current-spend/remaining-balance endpoint must not be assumed: https://help.getmoneytree.com/en/articles/3882797-budget-by-category-faq.
- Moneytree's official usage guidance covers mobile category budgets and notes they are not aligned with Custom Spending Cycle: https://help.getmoneytree.com/en/articles/11078828-how-to-use-budget-by-category.
- 17 October 2026: User confirmed an existing iOS budget appears after signing into the same account on Android. This establishes cross-device sync of budget definitions, but not which backend endpoint, storage layer, or API authentication the mobile clients use.
- 17 October 2026: inspected the Android Moneytree app with JADX. Its budget API interface and models were readable despite unrelated decompilation errors. The extracted APK and decompiled code are local inspection artifacts and are not part of this extension.
- Android `DefaultApi` declares GET `budgets.json` returning `{ budgets: [{ category_id, amount }] }`, DELETE `budgets/{id}.json`, and PUT `budgets/{id}.json` accepting a JSON request with `amount` and returning a budget. Retrofit's annotation parser confirms `rk.p` means PUT. The parameter is named `categoryId`. Android's budget repository calls `updateBudget(categoryId, BudgetRequest(amount))` for saving and has a separate `deleteBudget(categoryId)` path; no separate create-budget method was found in the decompiled API interface. A live reversible test confirmed PUT creates a missing budget and updates an existing one, and DELETE removes it. Shared CRUD code now exists locally, with mocked service tests and read-after-write verification.

## Open questions

1. How do the saved budget definitions map to mobile category budgets, period, currency, and feature gating? The observed model includes only category ID and amount. A live read returned saved budget limits; compare with the mobile app if necessary. The `list-budgets` view now shows the parent category name instead of raw numeric IDs where a parent exists.
2. Confirm rejection behavior for invalid amounts and feature-gated accounts only if those cases become relevant; do not send speculative writes to the live account. Never export account credentials or tokens to the terminal.
3. Is spend computed on-device, or obtainable via the backend? If computed locally, reconcile card settlements, stored-value top-ups, transfers, refunds, and reimbursed work expenses before presenting a current budget state.
4. Which budgets exist in the iOS app already and what exact category/period mapping do they use? Moneytree categories need not map one-to-one to an independent cash-flow budget.

## Live CRUD verification

- Through the locally installed authenticated Moneytree AI extension, selected a previously unbudgeted expense category. Created a temporary small limit, read it back, updated it, read it back, deleted it, and read budgets again. Each write reported `verified: true`; independent `get-budgets` reads matched the expected state at every step.
- Final state contains only the pre-existing limits, which were unchanged. This verifies the AI tool path, not the List Budgets form interactions or the Raycast developer eval runner.

## Safe evidence to collect

- User-visible screenshots of the Android budget list and one budget detail/settings screen (redact private amounts if desired). Cross-device sync is already confirmed.
- If further Android inspection is needed, collect only sanitized request **metadata**: host, path, method, status, and redacted response field names. Never record or share Authorization, cookies, passwords, refresh tokens, API keys, account numbers, or full financial payloads. Avoid MITM/certificate-pinning bypasses. Use only the write routes established by Android's API interface and user-approved reversible tests.
- The extension now includes create/update/delete AI tools and List Budgets actions, with shared validation and read-after-write verification. The Raycast UI confirms deletion. The AI descriptions require an explicit request for each write; global AI tool permission settings can differ by chat. `node --test tests/budgets.test.mjs` exercises fixture responses only. Live AI tool writes have now been verified and the temporary budget removed. UI form interactions are still untested. `npx ray evals` currently cannot run because the CLI requires `npx ray login` (Raycast developer login). Do not move tokens into a shell to bypass this.
