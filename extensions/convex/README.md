# Convex Tools for Raycast

Interact with your [Convex](https://convex.dev) projects directly from Raycast. Switch between projects, run functions, browse tables, view real-time logs, search documentation, and explore components without leaving your keyboard.

## Features

### Manage Projects

Quickly manage and switch between your Convex teams, projects, and deployments. Your selection is persisted across all commands.

### Switch Deployment

Quick switcher for changing between dev, prod, and preview deployments within your current project. Perfect for when you need to quickly check something in a different environment.

### Run Function

Search and execute your Convex queries, mutations, and actions:

- Fuzzy search across all functions
- JSON argument input with validation
- View execution results with timing
- Copy results to clipboard
- Support for queries, mutations, and actions

### Data

Explore your database tables and documents:

- List all tables in your deployment
- Paginated document browsing
- View full document details with metadata panel
- Collapsible raw JSON view (toggle with ⌘+J)
- Enhanced field value formatting for timestamps, objects, and arrays
- Copy document IDs and JSON
- Search and filter documents

### Logs

Stream real-time function execution logs with enhanced features:

- Live log streaming from your deployment
- Function call tree visualization showing parent-child relationships
- Collapsible console output (toggle with ⌘+L)
- Request-level filtering to view all executions in a request
- Enhanced metadata showing execution environment, caller, and identity
- Copy execution IDs
- Filter by function name
- View execution time, status, and errors
- Pause/resume streaming

### Search Docs

Quick access to Convex documentation:

- Browse 60+ documentation articles
- Organized by categories (Getting Started, Database, Functions, etc.)
- Quick links to guides and API references
- Search functionality

### Components

Discover and install Convex components:

- Browse 30+ available components
- View component descriptions and features
- Copy install commands
- See npm download stats
- Direct links to component repositories

### Configure Deploy Key

Set up deploy key authentication for direct access to a specific deployment:

- Alternative to OAuth browser login
- Perfect for accessing a single deployment quickly
- Validates credentials before saving
- Easy disconnect option

### Open Dashboard

Quickly open the current deployment in the Convex dashboard in your browser. No-view command for instant access.

### Copy Deployment URL

Copy your current deployment URL to clipboard with a single command. Perfect for sharing or pasting into configuration files.

## Installation

### From Raycast Store (Recommended)

1. Open Raycast
2. Search for "Convex Tools"
3. Click Install

### Manual Installation (Development)

1. Clone this repository
2. Navigate to `extensions/convex`
3. Run `npm install` or `pnpm install`
4. Run `npm run dev` to start development mode

## Authentication

This extension supports two authentication methods:

### Option 1: OAuth Login (Recommended for multiple projects)

Uses **OAuth 2.0 Device Authorization Flow** to securely authenticate with your Convex account.

#### How it works:

1. When you first use the extension, you'll see a "Sign in with Convex" button
2. Click to start authentication - a browser window will open
3. Complete the sign-in in your browser (you'll see a verification code)
4. Once authenticated, you'll have access to all your Convex projects

#### Security:

- No client secrets are stored in the extension
- Tokens are stored securely using Raycast's LocalStorage API
- You can sign out at any time from any command

### Option 2: Deploy Key (Recommended for single deployment access)

Use a deploy key for direct access to a specific deployment without browser login.

#### How to set up:

**Method A: Using the Configure Deploy Key command (Recommended)**

1. Open Raycast and search for "Configure Deploy Key"
2. Enter your Deploy Key (get from Convex Dashboard → Settings → Deploy Key)
3. Enter your Deployment URL (e.g., `https://your-deployment.convex.cloud`)
4. The credentials will be validated before saving

**Method B: Using Extension Preferences**

1. Open Raycast Preferences (⌘,)
2. Go to Extensions → Convex
3. Enter your Deploy Key and Deployment URL

#### Deploy Key Format:

- **Deploy Key**: `instance-name|0a1b2c3d4e5f...` (from Dashboard → Settings → Deploy Key)
- **Deployment URL**: `https://instance-name.convex.cloud`

#### Important Notes:

- Deploy key mode locks you to a single deployment
- You cannot switch between projects/deployments in deploy key mode
- To switch projects, disconnect the deploy key first
- BigBrain features (team/project selection) are not available with deploy keys

## Usage

### First Time Setup (OAuth)

1. Open Raycast and search for "Manage Projects"
2. Click "Sign in with Convex" to authenticate
3. Select your team, project, and deployment
4. You're ready to use all commands!

### First Time Setup (Deploy Key)

1. Open Raycast and search for "Configure Deploy Key"
2. Enter your deploy key and deployment URL
3. Click "Save Configuration"
4. You're ready to use data, functions, and logs commands!

### Switching Deployments

1. Open "Manage Projects" command
2. Navigate through Teams → Projects → Deployments
3. Select your desired deployment
4. All other commands will now use this deployment

### Running Functions

1. Open "Run Convex Function" command
2. Search for your function by name or type
3. Enter JSON arguments (if needed)
4. Press Enter to execute
5. View and copy results

### Browsing Tables

1. Open "Data" command
2. Select a table from the list
3. Browse documents with pagination
4. View full document details with metadata
5. Toggle raw JSON view with ⌘+J

### Viewing Logs

1. Open "Logs" command
2. View real-time function execution logs
3. Toggle console output with ⌘+L
4. Filter by function name or request ID
5. View call trees and execution metadata

### Searching Documentation

1. Open "Search Docs" command
2. Browse by category or search
3. Select an article to open in browser

### Browsing Components

1. Open "Components" command
2. Browse available components
3. Copy install commands
4. Open component repositories

## Keyboard Shortcuts

| Action                 | Shortcut |
| ---------------------- | -------- |
| Go back                | `⌘ [`    |
| Copy to clipboard      | `⌘ C`    |
| Copy JSON              | `⌘ ⇧ C`  |
| Open in Dashboard      | `⌘ O`    |
| Load more              | `⌘ L`    |
| Toggle console (Logs)  | `⌘ L`    |
| Toggle raw JSON (Data) | `⌘ J`    |

## Troubleshooting

### "No Deployment Selected"

Use the "Manage Projects" command to select a team, project, and deployment first. Or use "Configure Deploy Key" to set up deploy key authentication.

### Authentication Issues

1. Try signing out and signing back in
2. Check that you have access to the team/project in the Convex Dashboard
3. Ensure your browser can reach `auth.convex.dev`

### Deploy Key Issues

1. Verify the deploy key is correct (Dashboard → Settings → Deploy Key)
2. Make sure the deployment URL matches your deployment
3. Use "Configure Deploy Key" to validate and re-enter credentials

### "BigBrain API error: 401 Unauthorized"

This error occurs when trying to use OAuth features with an invalid or expired token:

1. Sign out and sign back in
2. Or switch to deploy key mode if you only need access to one deployment

### Functions Not Loading

- Only public functions are shown
- Internal functions (not exported) are hidden
- Make sure your deployment has been pushed

### API Errors

- Check your network connection
- Verify the deployment is accessible
- Try switching to a different deployment

## Development

This extension is part of the [Convex Panel](https://github.com/get-convex/convex-panel) monorepo.

### Structure

```
extensions/convex/
├── src/
│   ├── switch-project.tsx       # Manage Projects command
│   ├── switch-deployment.tsx    # Switch Deployment command
│   ├── run-function.tsx         # Run Function command
│   ├── data.tsx                 # Data browser command
│   ├── logs.tsx                 # Logs viewer command
│   ├── search-docs.tsx          # Search Docs command
│   ├── components.tsx           # Components browser command
│   ├── configure-deploy-key.tsx # Configure Deploy Key command
│   ├── open-dashboard.tsx       # Open Dashboard command
│   ├── copy-deployment-url.tsx  # Copy Deployment URL command
│   ├── lib/
│   │   ├── auth.ts              # OAuth device code flow
│   │   ├── api.ts               # Convex API client
│   │   ├── bigbrain.ts          # BigBrain API for teams/projects
│   │   ├── deployKeyAuth.ts     # Deploy key authentication
│   │   └── constants.ts         # Shared constants
│   ├── hooks/
│   │   ├── useConvexAuth.ts     # Authentication hook
│   │   └── useConvexData.ts     # Data fetching hooks
│   └── components/
│       ├── AuthGuard.tsx        # Authentication wrapper
│       ├── AuthenticatedListGuard.tsx
│       └── DeploymentSelector.tsx
├── assets/
│   ├── command-icon.png
│   └── extension-icon.svg
├── metadata/
│   ├── convex-1.png             # Screenshots
│   ├── convex-2.png
│   └── convex-3.png
├── package.json
└── README.md
```

### Running Locally

```bash
cd extensions/convex
npm install
npm run dev
```

### Building

```bash
npm run build
```

## Contributing

Contributions are welcome! Please read the contributing guidelines in the main repository.

## License

MIT
