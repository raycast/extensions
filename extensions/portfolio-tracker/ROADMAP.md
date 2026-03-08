## PHASE 1: MVP (Completed)

1. **Base functionality**: accounts, positions, apis, raycast front-end ✅
2. Prettify the UI and UX (this is a conversation mode - I'll describe in detail, back and forth with hot-reloads) ✅
3. **Add cash positions handling** ✅
4. **Add option to rename assets** - custom name. Where over hover and in detailed view it would show original name. This is sometimes needed when Yahoo api returns cryptic names for certain assets. Batch rename is also supported where post-renaming a tooltip asks if other matchins assets should be renamed ✅
5. Add a github pipeline for unit testing and linting, with separate PR branch and main treatment. ✅
6. Fix "Add Position", where after adding, the context returns to search, leading user to believe the next search would add another position. This is a good flow overall. However the next search and "Add" in fact overwrites the previous position. Keep the flow but fix so that the next search Add adds a new position. ✅

## PHASE 2: FIRE, Housing & Debt asset classes, Import & Export (Completed)

1. **FIRE Dashboard — Financial Independence, Retire Early tracking.** Separate command. 🔧
   - Setup form: target value (with spending calculator helper), withdrawal rate, inflation, growth rate, year of birth, holiday entitlement, SIPP access age, account exclusion ✅
   - Projection engine: year-by-year compound growth with real returns (growth − inflation), half-year contribution approximation ✅
   - ASCII horizontal bar chart in Raycast Detail markdown with target line marker and 🎯 FIRE year highlight ✅
   - Dashboard with metadata panel: FIRE year, age, days/working days to FIRE, progress %, contributions summary, assumptions ✅
   - Contributions management: single-frame rendering (list/add phases), position picker grouped by account, add/remove with persistence ✅
   - Account exclusion from FIRE calculation ✅
   - 109 unit tests for calculator + chart builder ✅
   - UX iteration (hot-reload polish pass) ✅
   - Show Contributions growth with different color to starting portfolio bulk sum ✅
   - Create pretty SVG chart with fallback to ASCII (later will expose as stylistic choice) ✅
   - Advanced: New SVG, below in the dashboard. Shows Split projection by accessible (ISA/GIA) vs locked (SIPP/401K) accounts with SIPP access age gate. Clear values shown on each bar part. So in each interval, two bar parts with two values displayed right over them. ✅
2. **Make SVG charts enlargeable and downloadable.** ✅
3. **Manage Contributions: add Edit contribution**. Currently only Add and Delete. (FireDashboard.tsx line 417) ✅
4. At the top of the FIRE Dashboard, when it says you're on track, it currently checks for 30 years flat. It should, in the initial FIRE screen, and on fire settings, have a field at the top to ask for Target FIRE age OR Target FIRE year. Calculations proceed as usual unaffected just the top then display on target or not for that amount. ✅
5. Fix "Search Investments" not to assume an Account but start search without account selected, then on found entry move to another sceen to add to account -> select account (with option to add new account) -> confirm asset details (with option to edit name, units, price) -> add position. ✅
6. **Add Property handling (Including Mortgage) as an asset class**.
   On addition ask for Total Value, Current Equity, date of valuation and post code. Create a service to fetch the price percentage change since valuation date based on the postcode (using a property price index). ✅
   - Fix property-price test suite (`Color` mock missing from `@raycast/api` mock) ✅
   - Fix mortgage calculation display: HPI % is applied to full property value, displayed change % is now equity-relative (not raw HPI) so the user sees how much their equity grew ✅
   - Fix property row labels: "Price per unit" → "Equity", "Day change:" → "Change since valuation:", "Total value:" → "Equity:" ✅
   - Fix property context actions: no "Add Units" for property, default action is "Edit Asset", added "Add Valuation" (⇧⌘V) ✅
   - Add Shared Ownership setting (%) — ownership ratio applied to net change (principal repaid + market appreciation) ✅
   - Add "My Share of Deposit" (was Reserved Equity) — user's own portion of the deposit, unaffected by ownership split ✅
   - Formula: `adjustedEquity = myEquityShare + (netChange × ownershipPercent / 100)` ✅
   - Dual percentage display in list: `equityChange% / hpiChange%` with tooltip "Equity change / Market value change" ✅
   - Detail panel shows Ownership Share, My Share of Deposit, Net Change, My Share of Change, and Your Equity ✅
   - "Show Calculations" action (⌥⌘K) — full step-by-step markdown breakdown with formula, numbers, emojis, and colours ✅
   - Validated against real-life mortgage with bank-confirmed figures (£470k property, 60% SO, -5.1% HPI) ✅
   - 65 new unit tests including real-life example validation (497 total) ✅
7. **Add Debt handling as an asset class**. ✅
   - Account type: 💰🔻 Debt with five position types: 💳 Credit Card, 🏦 Loan, 📚💰 Student Loan, 🚗 Auto Loan, 💳 BNPL
   - Data model: `DebtData` interface with balance, APR, monthly repayment, repayment day of month, loan start/end dates
   - Debt calculator service (`services/debt-calculator.ts`): standard amortisation formula, monthly balance updates (interest + repayment), repayment schedule projection, loan progress tracking
   - Debt repayment tracking service (`services/debt-repayments.ts`): auto-applies repayments on repayment day via LocalStorage log, idempotent sync, batch processing
   - Portfolio integration: debt values **subtracted** from portfolio total (net worth), debt positions skip Yahoo Finance API (local calculation only)
   - AddDebtForm / EditDebtForm: adaptive fields by debt type, auto-calculated amortised payment from loan dates, currency override
   - Paid-off state: greyed-out strikethrough display, "Mark as Paid Off" toggle in edit form
   - Archive system: paid-off debts can be archived (hidden + excluded from totals), "Toggle Archived" action shows/hides archived debt
   - Detail panel: outstanding balance, APR, monthly repayment, repayment day, loan progress, portfolio impact, original balance
   - FIRE integration: debt positions selectable as contribution targets (repayment = contribution)
   - 66 new unit tests for debt calculator (563 total) covering amortisation, monthly updates, repayment counting, loan progress, edge cases, and real-world scenarios (credit card, BNPL, student loan, auto loan)
     7.1. **Debt SVG Visualisations** ✅
     Standalone Debt Repayment Projection SVG with principal (red) + interest (yellow) stacked bars, debt-free year highlight, and legend.
     - Removed debt overlay from Growth SVG — debt visuals are concentrated in the separate Debt SVG chart ✅
     - Fixed interest bar visibility: interest accrued during the year is always shown as the rightmost yellow section of the bar, even when annualised repayment exceeds interest (previously the yellow bar disappeared because the month-end snapshot showed zero interest balance) ✅
     - Dropped contributions-to-debt wiring — debt projection uses Monthly Repayment from Portfolio data directly, no need to route through Contributions flow ✅

8. **Add Import/Export functionality**. ✅
   Separate command. Export to CSV with columns for account, asset name, symbol, units, price, total value, currency, asset type, last updated date, and additional parameters (JSON).
   Import from CSV with same format, with validation and error handling for missing/invalid fields. Support for multiple accounts via account column.
   - "Additional Parameters" column: JSON field that captures all non-standard settings for specialised position types (mortgage, property, debt). Properly escaped for CSV (RFC 4180). Enables full round-trip export/import of all position types. ✅
   - Mortgage/Property/Debt positions: exported with `mortgageData`/`debtData` serialised into Additional Parameters JSON. On import, JSON is parsed back to restore the full position with all specialised data. ✅
   - Specialised positions without Additional Parameters are skipped on import with a helpful message directing users to re-export or add manually. ✅
   - Import Preview rewritten from static Detail/markdown to interactive `List`-based UI: succinct summary row ("17 positions read over 6 accounts, 0 errors"), per-position rows with toggleable selection (checkmark/circle icons), duplicates marked with ⚠️ and deselected by default, Select All / Deselect All actions, error and skipped sections as List.Sections. ✅
   - Selective import: users can deselect individual rows before confirming; only selected rows are imported. ✅
   - `buildAdditionalParameters` / `parseAdditionalParameters`: pure functions for JSON serialisation/deserialisation of MortgageData and DebtData with alphabetical key ordering and undefined-stripping. ✅
   - 37 new unit tests for Additional Parameters (build, parse, round-trip for mortgage and debt) — 790 total tests passing. ✅
9. Fix Portfolio Tracker "Day Change" showing as "+0.01%" where it should be "+1%" — Yahoo API returns `regularMarketChangePercent` as a decimal fraction (e.g. 0.01535), now multiplied by 100 at the API layer to convert to percentage (1.535%). ✅
10. **Custom Icon and Colour Scheme**: ![#B9E3C6](https://placehold.co/15x15/B9E3C6/B9E3C6.png)![#59C9A5](https://placehold.co/15x15/59C9A5/59C9A5.png)![#D81E5B](https://placehold.co/15x15/D81E5B/D81E5B.png)![#23395B](https://placehold.co/15x15/23395B/23395B.png)![#23395B](https://placehold.co/15x15/23395B/23395B.png)![#FFFD98](https://placehold.co/15x15/FFFD98/FFFD98.png)[Coolors](https://coolors.co/b9e3c6-59c9a5-d81e5b-23395b-fffd98)✅

## PHASE 3: Release to Raycast Store and User Feedback Loop (In Progress)
1. **Release to Raycast Store**: Prepare and submit the extension for review, including all necessary assets (icon, screenshots, description).
- Complying with [instructions](https://developers.raycast.com/basics/prepare-an-extension-for-store) ✅
2. Improvements: when adding Stock/ETF position ("Add <Position>" screen after asset selection from search), or in "Edit Asset" allow total value input (with auto-calculation of units based on current price) as well as number of units. This is a common use case where users know how much they invested but not how many shares they bought (especially with fractional shares). Or when mock-tracking a similar financial instrument that has very different per unit price but will see similar price movement (ex. where some non-publicly traded fund like retirement funds use cannot be searched in the Yahoo finance or alternatives) ✅
3. Add AI Extension support for both Portfolio Tracker and FIRE Dashboard, providing natural language queries and insights based on the user's portfolio data. Example queries: "What's my current asset allocation?", "How much have I contributed this year?", "When will I reach FIRE based on my current trajectory?", "What if I increase my contributions by 10%?". This relies on exposing the portfolio data and FIRE detailed calculations based off portfolio to the AI input. Documentation here: https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions and here: https://developers.raycast.com/ai/write-evals-for-your-ai-extension and here https://developers.raycast.com/ai/follow-best-practices-for-ai-extensions ✅

## PHASE 4: Coast FIRE and Portfolio Analytics (Future)
1. **Fee Tracking: Account level and ETF level** Add entry for fees on Account level and on each Position level. This is a new option in the Portfolio Tracker when editing and adding accounts and positions. Check the Yahoo API response it it includes asset type for Position (only ETFs attract annual fees). It's % based, anually. FIRE setting then have an option to "Adjust growth for Account Fees" and "Adjust growth for ETF Fees" which are ON by default. When ON, FIRE SVG chart calculations subtract a sum of (account fee + position fee) from the growth rate (negative possible). Then a new SVG Chart ("Fee Tracking") is present showing the total sum of all fees (bar stacked with two values: account fees and ETF fees) shown over time, with same format at the other SVGs.
2. Visual Improvements - better FONT? More Colors. Consistency in Emojis. Better color composition.
3. **Notifications on Important portfolio events.**

4. **Add Coast FIRE mode** as a selectable option from a dropdown in the top right of the FIRE Dashboard. This mode adds two inputs and a section to FIRE settings called "Coast Fire". It takes two mutually exclusive parameters, either "Years till Coast FIRE" or "Coast Retirement target year". The COAST idea is to stop having to contribute to portfolio growth (allowing for part time or lighter income stream). Users will want to find out when they can start Coasting given a specified retirement target, or conversely, given a specified Coast target, when they can stop contributing and start coasting. The projection engine will need to be adapted to calculate the Coast target value based on the specified retirement year and assumptions, or calculate the Coast FIRE year based on the specified target value and assumptions. The dashboard will also need to be adapted to display the Coast target line on the chart and include relevant metadata in the panel. 🔧 techically this is a combination of projections with and without contributions (I guess calculate the contribution-less growth vector for each year of standard display, then check the earlier date that matches or exceeds the target budget - you might have a better/smarter way to handle this).
5. **Pluggable Data Providers** Abstract Yahoo Finance API calls to allow switching to Google Finance or other providers as a menu selection.
6. **Add portfolio graph over time**. Separate command. Two displays: Line chart with adjustable time frame (both range and granularity(day, week:default, month, year)) showing the total asset value over time. Second graph showing same broken into a data series (line) for each account. Without pulling backdated asset valuation, with initial portfolio, this will be a single dot line on the graph - this is fine for this stage.
7. **Add portfolio exports to more formats**: PDF, Excel, Google Sheets.
