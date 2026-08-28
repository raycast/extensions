# Caaals Food Tracker

Log food with AI, re-log favorites in a keystroke, track your weight, and keep today's calories in your menu bar — all from Raycast.

[Caaals](https://caaals.com) is an AI-powered calorie tracker. This extension brings the daily loop — log, review, repeat — to your Mac without opening the app.

## Setup

1. Install the extension from the Raycast Store.
2. Generate an API token from **Settings > Integrations** in the Caaals mobile or web app.
3. Open any command — Raycast will prompt you to fill in your preferences:
   - **API URL** — The base URL of your Caaals instance (defaults to `https://caaals.onrender.com`).
   - **API Token** — The personal API token you generated in step 2.
4. You're all set.

## Commands

### Log Food

Describe what you ate in plain text (e.g. "200g chicken breast with rice and salad"). The AI analyzes the food and shows a full nutritional breakdown with its confidence and data source. Adjust the quantity, serving, or meal right from the confirmation screen, then log it — optionally adding it to your favorites at the same time.

Tip: type the description directly as an argument in Raycast's root search ("Log Food 2 eggs and toast") to skip the form entirely.

### Quick Log

Your favorites and recent foods in one list. Hit Enter to log a food to the meal matching the time of day — no AI call, no wait, no tokens. Use the action panel to pick a different meal, adjust quantity and serving before logging, or manage favorites.

### Browse Diary

Your last 7 days grouped by date, with daily totals, calorie goal, and nutrition score in each section header. From any entry you can view details, log it again today, move it to another meal, copy its whole meal to today, add the food to favorites, confirm entries flagged for review, copy nutrition info, or delete it.

### Log Weight

Record today's weight (with optional body fat % and note). Shows your current weight, 7-day change, and goal — in kg or lb following your Caaals unit preference.

### Today's Calories in Menu Bar

A menu bar item with your remaining calories for the day, refreshed every 15 minutes. The dropdown shows calories and macros against your goals, your nutrition score, and shortcuts to the other commands. Running the command from root search activates or refreshes the menu bar item — its root-search entry always shows your current status (e.g. "743 kcal left today").
