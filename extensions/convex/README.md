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
2. Navigate to `apps/raycast`
3. Run `npm install` or `pnpm install`
4. Run `npm run dev` to start development mode

## Authentication

This extension uses **OAuth 2.0 Device Authorization Flow** to securely authenticate with your Convex account.

### How it works:

1. When you first use the extension, you'll see a "Sign in with Convex" button
2. Click to start authentication - a browser window will open
3. Complete the sign-in in your browser (you'll see a verification code)
4. Once authenticated, you'll have access to all your Convex projects

### Security:

- No client secrets are stored in the extension
- Tokens are stored securely using Raycast's LocalStorage API
- You can sign out at any time from any command

## Usage

### First Time Setup

1. Open Raycast and search for "Manage Projects"
2. Click "Sign in with Convex" to authenticate
3. Select your team, project, and deployment
4. You're ready to use all commands!

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

Use the "Manage Projects" command to select a team, project, and deployment first.

### Authentication Issues

1. Try signing out and signing back in
2. Check that you have access to the team/project in the Convex Dashboard
3. Ensure your browser can reach `auth.convex.dev`

### Functions Not Loading

- Only public functions are shown
- Internal functions (not exported) are hidden
- Make sure your deployment has been pushed

### API Errors

- Check your network connection
- Verify the deployment is accessible
- Try switching to a different deployment

## Development

This extension is part of the [Convex Panel](https://github.com/convex-panel/convex-panel) monorepo.

### Structure

```
apps/raycast/
├── src/
│   ├── switch-project.tsx       # Manage Projects command
│   ├── switch-deployment.tsx    # Switch Deployment command
│   ├── run-function.tsx         # Run Function command
│   ├── data.tsx                 # Data browser command
│   ├── logs.tsx                 # Logs viewer command
│   ├── search-docs.tsx          # Search Docs command
│   ├── components.tsx           # Components browser command
│   ├── open-dashboard.tsx       # Open Dashboard command
│   ├── copy-deployment-url.tsx  # Copy Deployment URL command
│   ├── lib/
│   │   ├── auth.ts              # OAuth device code flow
│   │   ├── api.ts               # Convex API client
│   │   ├── bigbrain.ts          # BigBrain API for docs/components
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
cd apps/raycast
pnpm install
pnpm dev
```

### Building

```bash
pnpm build
```

## Contributing

Contributions are welcome! Please read the contributing guidelines in the main repository.

## License

MIT
