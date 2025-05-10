# Tableau Navigator

Tableau Navigator is a Raycast extension that allows you to quickly search and access your Tableau dashboards and visualizations from anywhere on your Mac.

## Features

- 🔍 **Fast Search**: Quickly find Tableau dashboards and charts by name, project, or owner
- 🔄 **Real-time Data**: Connect directly to your Tableau for up-to-date results
- 🔗 **Quick Access**: Open dashboards in your browser or copy links with one keystroke
- 📊 **View Details**: See key information like update dates, owners, and project information
- 🔐 **Secure Authentication**: Uses Tableau Personal Access Tokens for secure authentication

## Setup Requirements

Before you can use Tableau Navigator, you'll need:

1. Access to a Tableau Server or Tableau Cloud instance
2. Personal Access Token (PAT) credentials
3. API access permissions on your Tableau account

## Configuration

To configure Tableau Navigator, you'll need to provide the following information in the extension's preferences:

### Required Settings

- **Tableau Server URL**: The complete URL to your Tableau server (e.g., `https://tableau.example.com`)
- **Tableau API Version**: The REST API version to use (e.g., `3.24`)
- **Personal Access Token Name**: The name of your Personal Access Token
- **Personal Access Token Secret**: Your Personal Access Token secret value
- **Tableau Site ID**: Your site's Content URL (leave empty for Default site)

## How to Get Your Credentials

### Personal Access Token (PAT)

1. Log in to your Tableau Server or Tableau Cloud
2. Go to your user profile (click your name in the top right)
3. Select **My Account Settings**
4. Scroll to the **Personal Access Tokens**
5. Click **Create new token**
6. Enter a descriptive name for your token
7. Click **Create**
8. **IMPORTANT**: Copy both the token name and secret value immediately - the secret will only be shown once!

### Finding Your Site ID (Content URL)

- If you're using the Default site, leave this field empty
- For other sites, the Site ID is the "contentUrl" value, which you can find in the URL when browsing that site
- Example: In the URL `https://tableau.example.com/#/site/sales/projects`, the Site ID is `sales`

### API Version

- The API version should match what your Tableau server supports
- Recent versions (3.19 and above) generally work well
- Default recommended: 3.24

## Troubleshooting

### Common Connection Issues

- **Authentication Errors**: Double-check your Personal Access Token name and secret (they are case-sensitive)
- **Server URL Format**: Ensure your server URL includes the `https://` prefix
- **API Version**: Make sure you're using a version supported by your server
- **Permission Errors**: Confirm your Tableau account has sufficient permissions
- **Network Issues**: Check if your device can access the Tableau server

### Updating Settings

If you need to change your connection settings:

1. Open Raycast
2. Type "Search Tableau" to find the extension
3. Press ⌘, (Command + Comma) to open Extension Preferences
4. Update your settings and try again

## Usage Tips

- Use the search bar to filter dashboards by name, project, or owner
- Press ⌘R to refresh the dashboard list
- Use keyboard shortcuts to quickly open or copy links to dashboards

## Privacy & Security

Your Tableau credentials are stored locally on your device using Raycast's secure preferences storage. The extension only connects to your specified Tableau server and doesn't send data anywhere else.

---

Happy navigating through your Tableau dashboards!