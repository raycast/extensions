# Caaals Food Tracker Changelog

## [Quick Log, Weight, Menu Bar & More] - 2026-07-07

### New commands

- **Quick Log** — log favorites and recent foods in one keystroke, with no AI wait. Pick a meal, adjust quantity/serving, and manage favorites from the action panel
- **Log Weight** — record today's weight with optional body fat % and note; shows your current weight, 7-day change, and goal (kg or lb per your Caaals unit preference)
- **Today's Calories in Menu Bar** — menu bar item with remaining calories, refreshed every 15 minutes; dropdown shows macros vs goals and your nutrition score, and the command's root-search entry shows your live status

### Log Food

- Type the food description directly as an argument from Raycast root search
- Adjust quantity, serving, and meal on the confirmation screen before logging
- "Log and Add to Favorites" action
- Confirmation screen shows AI confidence, nutrition data source, review warnings, and your monthly AI token balance
- Logged entries are now linked to their AI analysis, so your corrections improve Caaals' accuracy tracking

### Browse Diary

- Daily calorie goal and nutrition score in each day's header
- Confirm entries flagged as "Needs review" so they count toward your totals
- Log an entry again today, move it to another meal, copy a whole meal to today, or add its food to favorites
- Loads the week in a single request (faster, no partial-failure toasts)

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Initial Release] - 2026-04-02

- Log food using AI text analysis
- Browse diary entries from the past 7 days
- View detailed nutrition breakdown for each entry
- Delete diary entries
