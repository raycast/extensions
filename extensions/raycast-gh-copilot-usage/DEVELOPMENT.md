# GitHub Copilot Premium Usage - Raycast Extension

View your GitHub Copilot Premium request usage directly in Raycast without having to visit GitHub.

## Features

- **Current Month Summary**: View total requests, costs, and price per request
- **Model Breakdown**: See usage split by different AI models (GPT-5, Claude, etc.)
- **Manual Refresh**: Update your usage data on demand
- **Secure Token Storage**: Your GitHub Personal Access Token is stored securely in Raycast preferences

## Installation

### 1. Install the Extension

```bash
# Navigate to the extension directory
cd github-copilot-usage

# Install dependencies
npm install

# Build the extension (optional, for development you can use dev mode)
npm run build
```

### 2. Import to Raycast

1. Open Raycast
2. Run the command: **Import Extension**
3. Select this directory: `github-copilot-usage`
4. Raycast will import and activate the extension

### 3. Configure GitHub Personal Access Token

You need a GitHub Personal Access Token with specific permissions to access your billing data.

#### Creating Your Token

1. Go to: https://github.com/settings/tokens?type=beta
2. Click **"Generate new token"** (fine-grained personal access token)
3. Configure the token:
   - **Token name**: `Raycast Copilot Usage` (or any name you prefer)
   - **Expiration**: Choose your preferred duration (e.g., 90 days)
   - **Repository access**: No need to select repositories
   - **Account permissions**:
     - Scroll to **"Plan"** → Set to **"Read-only"**
4. Click **"Generate token"**
5. **Copy the token** (you won't be able to see it again!)

#### Adding Token to Raycast

1. Open Raycast
2. Run the command: **View Copilot Usage**
3. When prompted, paste your GitHub Personal Access Token
4. The token is saved securely in Raycast preferences

Alternatively:
1. Open Raycast preferences (⌘ + ,)
2. Navigate to **Extensions** → **GitHub Copilot Usage**
3. Paste your token in the **GitHub Personal Access Token** field

## Usage

### View Your Usage

1. Open Raycast (⌘ + Space)
2. Type: **View Copilot Usage**
3. Press Enter

The extension will display:
- **Total Requests**: Number of API requests made this month
- **Total Cost**: Total amount spent this month
- **Price per Request**: Average cost per request
- **Usage by Model**: Breakdown showing requests and costs per AI model

### Refresh Data

- Press **⌘ + R** while viewing the usage list
- Or select **"Refresh Data"** from the actions menu
- Or select the "Refresh Data" item at the bottom of the list

### Copy Information

- Select any item and press **⌘ + C** to copy the information to clipboard
- Each item has contextual copy actions (copy request count, cost, etc.)

## Data Information

### What Data is Shown

The extension uses GitHub's Billing API endpoint:
```
GET /users/{username}/settings/billing/premium_request/usage
```

This provides:
- Usage data for up to 24 months
- Daily processed metrics (data available up to yesterday)
- Requires telemetry to be enabled in your IDE

### Limitations

- **Minimum Requirements**: No minimum usage required for personal accounts
- **Data Delay**: Usage data is processed daily, so today's usage won't appear until tomorrow
- **Rate Limits**: GitHub API allows 5,000 requests/hour for authenticated users

## Troubleshooting

### "Invalid GitHub token"
- Verify your token is copied correctly (no extra spaces)
- Ensure the token hasn't expired
- Check that you created a **fine-grained** token (not classic)

### "Access forbidden"
- Verify your token has **"Plan"** permissions set to **Read-only**
- You may need to regenerate the token with correct permissions

### "No usage data available"
- You may not have used Copilot Premium features yet this month
- Usage data is processed daily - check back tomorrow
- Ensure you have GitHub Copilot Premium (not just Copilot Business/Individual)

### "Failed to fetch user"
- Check your internet connection
- Verify the token is valid
- Try regenerating the token

## Development

### Run in Development Mode

```bash
npm run dev
```

This will open Raycast in development mode with the extension loaded.

### Build for Production

```bash
npm run build
```

### Lint Code

```bash
npm run lint

# Auto-fix issues
npm run fix-lint
```

## Project Structure

```
github-copilot-usage/
├── src/
│   ├── view-copilot-usage.tsx   # Main UI component
│   ├── api/
│   │   └── github.ts            # GitHub API client
│   ├── types/
│   │   └── usage.ts             # TypeScript type definitions
│   └── utils/
│       └── formatting.ts        # Formatting utilities
├── assets/
│   └── command-icon.png         # Extension icon
├── package.json                 # Extension manifest
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## API Reference

### GitHub API Endpoints Used

1. **Get Current User**
   ```
   GET https://api.github.com/user
   ```
   Used to fetch your GitHub username

2. **Get Premium Request Usage**
   ```
   GET https://api.github.com/users/{username}/settings/billing/premium_request/usage
   ```
   Used to fetch Copilot Premium usage data

### Required Permissions

- **Plan** (Read-only): Required to access billing and usage information

## Privacy & Security

- Your GitHub Personal Access Token is stored securely in Raycast's preferences
- The token is never logged or transmitted anywhere except to GitHub's official API
- All API calls are made directly from your machine to GitHub
- No third-party services are used

## License

MIT

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify your token has the correct permissions
3. Ensure you're using GitHub Copilot Premium

## Contributing

Feel free to submit issues and enhancement requests!

## Changelog

### Version 1.0.0
- Initial release
- View current month Copilot Premium usage
- Display total requests, costs, and per-model breakdown
- Manual refresh functionality
- Secure token storage

## Credits

Built with [Raycast API](https://developers.raycast.com/) and GitHub's REST API.
