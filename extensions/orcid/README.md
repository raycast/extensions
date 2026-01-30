# ORCID for Raycast

Search researchers and access your ORCID profile directly from Raycast.

## Setup

This extension requires ORCID API credentials. Follow these steps:

1. **Create an ORCID account** at [orcid.org](https://orcid.org) if you don't have one
2. **Register for API credentials** at [orcid.org/developer-tools](https://orcid.org/developer-tools)
3. **Set the Redirect URI** to: `https://raycast.com/redirect?packageName=orcid`
4. **Copy your Client ID and Client Secret** into the extension preferences

## Commands

- **Copy ORCID** - Copy your ORCID iD to clipboard
- **Copy Name** - Copy your name from ORCID to clipboard
- **Open My Profile** - Open your ORCID profile in browser
- **Find Researchers** - Search for researchers by name

## Preferences

| Preference | Description | Required |
|------------|-------------|----------|
| Client ID | Your ORCID Public API Client ID | Yes |
| Client Secret | Your ORCID Public API Client Secret | Yes |
| Use Sandbox | Enable sandbox mode for testing | No |
