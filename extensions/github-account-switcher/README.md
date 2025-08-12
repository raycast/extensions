# GitHub Account Switcher

A Raycast extension for switching between GitHub CLI accounts and viewing your current account.

## Features

- **Switch GitHub Account**: Interactive account switching with credential clearing
- **Current Account**: View detailed information about your active GitHub account

## Commands

### Switch GitHub Account
- Lists all authenticated GitHub accounts
- Allows switching between accounts with confirmation
- Automatically clears cached credentials
- Configures git to use GitHub CLI authentication
- Verifies successful account switch

### Current GitHub Account
- Shows current active account details
- Displays token scopes and git protocol
- Provides quick actions to copy username and test git authentication

## Requirements

- GitHub CLI (`gh`) must be installed: `brew install gh`
- At least one authenticated GitHub account: `gh auth login`

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Publishing

```bash
npm run publish
```