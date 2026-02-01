# GitHub Copilot Usage

Track your GitHub Copilot Premium request usage directly in Raycast. Monitor your quota usage, remaining requests, and view detailed breakdowns by AI model—all without leaving your keyboard.

## Features

- **Real-time Usage Tracking**: View your current month's premium request usage with color-coded indicators
- **Quota Monitoring**: Track requests used vs your plan's quota limit with percentage indicators
- **Remaining Requests**: See exactly how many premium requests you have left this billing cycle
- **Reset Countdown**: Know when your quota refreshes with a helpful countdown
- **Multi-Plan Support**: Works with Copilot Free, Pro, Pro+, Business, and Enterprise plans
- **Model Breakdown**: See detailed usage statistics for each AI model (GPT-4, Claude, etc.)
- **Quick Actions**: Copy any metric or refresh data on demand
- **Secure Storage**: Your GitHub token is stored securely in Raycast preferences

## Setup

### 1. Create a GitHub Personal Access Token

You need a GitHub Personal Access Token with billing permissions to access your usage data.

1. Visit [GitHub Token Settings](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token** (fine-grained personal access token)
3. Configure your token:
   - **Token name**: `Raycast Copilot Usage` (or any name you prefer)
   - **Expiration**: Choose your preferred duration (e.g., 90 days)
   - **Repository access**: No repositories needed
   - **Account permissions**:
     - Scroll to **Plan** → Set to **Read-only**
4. Click **Generate token**
5. **Copy the token** - you won't be able to see it again!

### 2. Configure the Extension

1. Open Raycast and run **View Copilot Usage**
2. When prompted, paste your GitHub Personal Access Token
3. Select your Copilot plan from the dropdown (defaults to Pro)

That's it! The extension will fetch your usage data and display it.

## Usage

### View Your Usage

Open Raycast and type **View Copilot Usage** to see:

- **Usage Percentage**: How much of your quota you've used (color-coded: green/yellow/red)
- **Requests Used**: Total premium requests made this month vs your quota limit
- **Remaining Requests**: How many premium requests you have left
- **Reset Date**: When your quota refreshes (shown as countdown)
- **Model Breakdown**: Detailed usage for each AI model you've used

### Refresh Data

Press `⌘ + R` or select **Refresh Data** from the actions to update your usage statistics.

### Copy Information

Select any metric and press `⌘ + C` to copy it to your clipboard. Each item has contextual copy actions for quick access to the data you need.

## Supported Plans

- **Copilot Free**: 50 requests/month
- **Copilot Pro**: 300 requests/month
- **Copilot Pro+**: 1,500 requests/month
- **Copilot Business**: 300 requests/month
- **Copilot Enterprise**: 1,000 requests/month

## Troubleshooting

### "Invalid GitHub token"
- Verify your token is copied correctly (no extra spaces)
- Ensure the token hasn't expired
- Check that you created a **fine-grained** token (not classic)

### "Access forbidden"
- Verify your token has **Plan** permissions set to **Read-only**
- You may need to regenerate the token with correct permissions

### "No usage data available"
- You may not have used Copilot Premium features yet this month
- Usage data is processed daily by GitHub - check back tomorrow
- Ensure you have GitHub Copilot Premium (not just Copilot Business/Individual)

### "Failed to fetch user"
- Check your internet connection
- Verify the token is valid and not expired
- Try regenerating a new token

## Privacy & Security

- Your GitHub Personal Access Token is stored securely in Raycast's encrypted preferences
- The token is never logged or transmitted anywhere except to GitHub's official API
- All API calls are made directly from your machine to GitHub
- No third-party services are involved
- Only requires read-only access to billing/plan information

## About the Data

The extension uses GitHub's Billing API to fetch your premium request usage data. Usage data is:

- Updated daily by GitHub (today's usage appears tomorrow)
- Available for up to 24 months of history
- Sourced directly from GitHub's telemetry

**Note**: You must have telemetry enabled in your IDE for usage to be tracked by GitHub.

## Contributing

Found a bug or have a feature request? Please check [DEVELOPMENT.md](./DEVELOPMENT.md) for development setup instructions.

## License

MIT License - see [LICENSE](./LICENSE) for details.
