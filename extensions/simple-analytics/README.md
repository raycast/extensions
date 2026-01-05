# Simple Analytics Raycast Extension (Unofficial)

![Simple Analytics](metadata/simple-analytics-1.png)

View your [Simple Analytics](https://simpleanalytics.com) website statistics directly in your macOS menu bar.

## Features

- Display visitor and pageview counts in the menu bar
- Support for multiple websites with quick switching
- View top pages and referrers
- Customizable time ranges (Today, Last 7 Days, Last 30 Days)
- Works with both public and private websites

## Setup

### For Public Websites

If your Simple Analytics dashboard is public, you only need to enter your domain name. No API key required.

### For Private Websites

If your website statistics are private, you'll need an API key:

1. Go to [simpleanalytics.com/account](https://simpleanalytics.com/account)
2. Scroll to the **API keys** section
3. Click **Create API key**
4. Copy the generated key (starts with `sa_api_key_`)
5. Add your website in Raycast and paste the API key

## Usage

1. Open Raycast and run **Manage Websites**
2. Add your first website (domain + optional API key)
3. The **Website Stats** command will now show your statistics in the menu bar

### Menu Bar Actions

- Click the menu bar icon to see detailed statistics
- Use **Time Range** submenu to change the period
- Use **Switch Website** to toggle between multiple sites
- Press `⌘ + R` to refresh data

## Preferences

- **Menu Bar Display**: Show visitors only, pageviews only, or both
- **Default Time Range**: Set your preferred default time period
