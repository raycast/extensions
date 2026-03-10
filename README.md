# Vercel Analytics

Track Vercel Web Analytics visitors in the Raycast menu bar.

## About This Extension

This extension lets you:

- connect your Vercel account with an API token
- pick one Vercel project to track
- see the latest visitor count from your menu bar

## Additional Configuration Required

This extension requires a Vercel API token.

### 1) Create a Vercel API Token

1. Open Vercel account settings.
2. Go to `Tokens`.
3. Create a new token with access to the project/team you want to track.
4. Copy the token.

### 2) Add the Token and Select a Project in Raycast

1. Run the `Add Tracker` command.
2. Paste your Vercel API token.
3. Select the project you want to track.

### 3) View Visitors in Menu Bar

1. Open `Tracked Project Metrics`.
2. Keep it pinned in your Raycast menu bar commands.
3. Use `Refresh Metrics` to fetch the latest value.

## Behavior

- Tracks one project at a time.
- Shows visitor count only.
- Uses the project homepage row (`/`) when available.

## Troubleshooting

- **No data shown**: confirm Web Analytics is enabled for the selected project.
- **Project missing in picker**: ensure your token has access to the correct team/project.
- **Auth errors**: create a new token and re-run `Add Tracker`.

## README Media

If you add screenshots for documentation, place them in a top-level `media/` folder and reference them from this README.