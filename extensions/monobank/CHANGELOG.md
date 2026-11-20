# monobank Changelog

## [Visual Statistics, Family Subscriptions and Other Improvements] - 2026-11-13

- Added the "Show Statistics" command: a chart of your cash flow across your cards and FOP accounts, with four views in the search bar: Expenses and Income by category, Savings by jar, and Own Transfers by card. Press `↵` on a category or an account to hide it or show it again, and the chart and the totals of income, spending, savings and net follow at once. Accounts in other currencies are converted to UAH at monobank's rates. Transfers between your own accounts and to or from your jars are recognised in the stored statements and kept out of spending and income. Top-ups of a jar you smashed before installing the extension are Savings too, in "Show Statement" as well, once its payout is in the stored history; a transfer to your own card in another bank can't be told apart, so it stays under "Money transfer"
- See the transactions behind a number with "Show Transactions" (`⌘ ⇧ S`): on a category, jar or card in "Show Statistics", and on a budget in "Show Budgets" and "Manage Budgets…". The list has exactly the transactions counted, for the same period and accounts, with a total that equals the figure you came from. In a budget, transactions added by hand have an "Added" tag and excluded ones are listed under "Excluded", and Add to Budget, Remove from Budget and Move to Budget work there too
- A new access token for the same monobank account keeps the stored statement history, custom account names and the rest of your data, so "Sync Statements" doesn't load the history again. A token of another person removes the previous person's statements, pins, budgets and subscription changes once monobank accepts it; rates and pinned rates are kept. A rejected or mistyped token, or no connection, changes nothing
- Mark a subscription as family with "Mark as Family…" (`⌘ ⇧ F`) in "Show Subscriptions" and enter how many people share it, to see what each person pays in the list, the details, the menu bar and AI answers. Totals still count the full price, which your card pays
- When several subscriptions are due the same day, the "Subscriptions Menu Bar" title counts the others and shows their total price, e.g. `YouTube (+1) · 780 ₴ · tomorrow`, or `≈ 780 ₴` at monobank's rates when they're in different currencies
- Cards are listed Iron, Platinum and Black in UAH first, then White and Yellow, then the others, in "Show Accounts", the account dropdown in "Show Statement" and everywhere else
- Toggle Details is `⌘ ⇧ D` everywhere. In "Show Subscriptions", Copy Amount is now the second action (`⌘ ↵`)
- Correct a budget by hand when the merchant category is wrong: in "Show Statement", Add to Budget, Remove from Budget and Move to Budget count a transaction in a budget or leave it out, with Undo. The transaction's details show its budgets, "Show Budgets" shows what was added or excluded with a Clear Corrections action, and AI answers mention the corrections
- In "Show Budgets" and "Manage Budgets…", Enter copies a one-line summary of a budget to share, and `⌘ ↵` copies the amount left (or over). Edit Budget moved to `⌘ E`

## [AI, Statements, Budgets, Subscriptions, Menu Bar and Currency Converter] - 2026-11-12

- Added the "Currency Rate Menu Bar" command (macOS): a currency rate in the menu bar, with your pinned rates and all other rates in its menu. Choose the rate there, or with "Show in Menu Bar" (`⌘ ⇧ M`) in "Show Currency Rates", and choose whether the title shows the sell rate, the buy rate, both or only the flag
- Added the "Jar Progress Menu Bar" command (macOS): a jar's progress in the menu bar, with your other jars in its menu, and links to their top-up pages. Choose the jar there, or with "Show in Menu Bar" (`⌘ ⇧ M`) in "Show Accounts", and choose whether the title shows the percentage, the balance, the balance and goal, or nothing
- Added AI support: mention `@monobank` in AI Chat or Quick AI to ask, in English or Ukrainian, about balances, jars and their goals, top-up links, currency conversion, and spending or income by category and period. Accounts are found by their custom names, even across languages
- Added the "Show Statement" command to browse the transactions of your cards, FOP accounts and jars, with a "View Statement" action (`⌘ ⇧ S`) in "Show Accounts". On an account without a top-up page, it's the second action (`⌘ ↵`), after Copy IBAN
- Choose a period (today, last 7 days, this or last month, last 31 days, or a custom range), see a summary with spending by category, and export to CSV
- Transaction details include the merchant category, cashback, balance, comment, receipt number and counterparty, and mark transactions the merchant's bank hasn't settled yet as "Hold"
- Requests wait for monobank's 60-second rate limit with a countdown, and statements are cached
- The statement is stored per account and refreshed for the last 31 days whenever monobank allows, updating transactions that changed (e.g. a settled hold). Switching between periods it already covers is instant, and past periods load only once. Transactions older than the "Keep Statements For" preference (1 month to unlimited, 3 months by default) are cleaned up
- Pinned accounts from "Show Accounts" appear at the top of the account dropdown in "Show Statement". The chosen account and period are remembered for 5 minutes since they were last used; after that, the first pinned account (or the first UAH card) opens with Last 31 Days, and a different account no longer loads by mistake when the command opens. The period is remembered only for the account it was chosen on, so switching accounts resets it to Last 31 Days
- Added budgets: monthly limits in UAH for spending categories, created from scratch or from presets. The Summary in "Show Statement" shows each budget's progress for This Month and Last Month on UAH accounts, with what's left per day and a warning when a budget is near or over its limit
- Added the "Show Budgets" command and a "Manage Budgets…" action (`⌘ ⇧ U`) in "Show Statement" to create, edit, reorder and delete budgets
- Budgets count spending across your UAH cards (chosen with "Choose Accounts…" in "Show Budgets", all personal UAH cards by default) instead of one account at a time, with each card's share in the details
- AI can answer budget questions ("how much can I still spend on cafes?") and create, change or delete budgets after you confirm. Questions about a category's income, e.g. transfers received, are answered too
- Added the "Show Subscriptions" command: recurring charges on all your cards and FOP accounts (e.g. Netflix, ChatGPT, your mobile plan), found in the stored statements, with the amount, the next expected date, the monthly total and the ones that may have been cancelled. Rename them or hide what isn't a subscription. Subscriptions at the same price through one merchant (e.g. two $2.99 Apple subscriptions) show separately. A charge at a new price keeps the subscription, and one charged only once asks you to confirm the new price. Hiding can be undone from the toast. In "Show Statement", charges of a subscription have a "Subscription" tag, with actions to show it in "Show Subscriptions" or mark it as not a subscription. AI can answer about them too, e.g. "what's charging me next week?"
- The Summary in "Show Statement" groups spending by category name, so all hotel chains, for example, show as one "Hotels and resorts" row
- Added the "Subscriptions Menu Bar" command (macOS): your next subscription charge in the menu bar, e.g. `Netflix · tomorrow`, with the monthly total and all your subscriptions in its menu. Click one to open it in "Show Subscriptions", or hold `⌥` to copy its amount. Choose whether the title shows the next charge, the next charge with its price, the monthly total, how many charges are due this week, or only the icon
- Added the "Sync Statements" command: in the background, it syncs one account or jar every 2 minutes, skipping those already synced today, so every statement is up to date once a day without opening it
- "Sync Statements" also loads older history in the background, 31 days at a time, back to "Keep Statements For" (a year for Unlimited), so past periods open without waiting. It stops once the history is loaded, and picks up again when "Keep Statements For" gets longer
- AI can answer about any past period, e.g. "how much did I spend in May?", and about stored history of any length, e.g. the last 3 months. For a period longer than 31 days before the stored history, it explains monobank's limit and offers the longest period that fits
- In "Change Period", the error for a custom range longer than 31 days shows as you pick the dates, with the latest end date that fits
- Added a "Convert Currency" action (`⌘ O`) in "Show Currency Rates". It converts both ways, using the sell rate when you buy a currency and the buy rate when you sell it. On a rate with only a cross rate, it's now the second action (`⌘ ↵`) instead of Pin, which stays on `⌘ .`
- Added the "Convert Currency" command: type e.g. `Convert 100 usd` or `250 eur pln` in Raycast to see the result right away, with currency symbols and Ukrainian names (`$`, `€`, `грн`, `доларів`) understood
- "Show Currency Rates" and "Currency Rate Menu Bar" show how much each rate changed since the previous day, e.g. `↑ 0.12`, in green or red in "Show Currency Rates". Turn on "Change in Title" to also show it in the menu bar title
- Added "Copy Requisites" (`⌘ ⇧ R`) and "Copy Requisites in English" in "Show Accounts": an account's recipient, IBAN, tax ID and bank details for an invoice or a transfer. Set your full name and tax ID in the extension preferences
- "Currency Rate Menu Bar" now refreshes every 2 hours and when its menu is opened, and "Show Currency Rates" refetches rates older than 30 minutes instead of 24 hours
- Updated dependencies to the latest Raycast API
- Adopted Raycast common shortcuts: Pin is now `⌘ .` (`Ctrl .` on Windows) and Copy IBAN is now `⌘ ⇧ C` (`Ctrl ⇧ C` on Windows)
- Fixed a crash when searching accounts that have no card number
- Moved the access token to the extension preferences. It's now optional: "Show Currency Rates", "Convert Currency" and "Currency Rate Menu Bar" work without it. It's needed for your personal data: "Show Accounts", "Show Statement", "Show Budgets", "Show Subscriptions", "Sync Statements", "Jar Progress Menu Bar", "Subscriptions Menu Bar", and AI questions about your accounts. If you had set it before, you may need to enter it again
- Show a clear "Access token required" or "Invalid access token" screen with a shortcut to the preferences, and retry right after the token is fixed
- Cached accounts are now tied to the access token that loaded them, and are no longer shown after the token is changed, removed or rejected
- Fixed the accounts total showing NaN when an account or jar is in a currency other than UAH, USD or EUR
- Fixed currencies with a code below 100, such as the Australian dollar, missing from the rates

## [Fix] - 2025-12-02

- Used country flags in .png format so they look the same on both macOS and Windows platforms

## [Fix] - 2025-11-27

- Added Windows support

## [Fix] - 2024-05-28

- Fixed issue when extension was crashing if user has no jars

## [Update] - 2023-09-15

- Updated keywords for the extension

## [Initial Version] - 2023-08-23

Release of monobank extension
