# Convex Tools for Raycast

Convex Tools - A Raycast extension for interacting with your Convex backend directly from Raycast.

This extension provides quick access to essential Convex development workflows without leaving your keyboard:

## Features

### Manage Projects

Navigate between your Convex teams, projects, and deployments (dev/prod/preview). Your selection is persisted across commands. Search teams and projects by name or slug for quick access.

### Run Convex Function

Search and execute your Convex queries, mutations, and actions:

- Fuzzy search across all functions
- JSON argument input with validation
- View execution results with timing
- Copy results to clipboard

### Browse Convex Tables

Explore your database tables and documents:

- List all tables in your deployment
- Paginated document browsing
- View full document details
- Copy document IDs and JSON

### View Convex Logs

Stream real-time function execution logs:

- Live log streaming from your deployment
- Filter by function name and search
- View execution time, status, and errors
- Function call tree visualization
- Collapsible console output
- Request-level filtering
- Pause/resume streaming

### View Convex Documentation

Quick access to Convex documentation:

- Browse 60+ documentation links
- Organized by category (Getting Started, Features, API Reference, etc.)
- Search by title, category, or URL
- Direct browser access to docs
- Copy URLs and titles

### View Convex Components

Browse and install Convex components:

- 30+ official and community components
- Categorized by AI, Backend, Database, Integrations, Payments, etc.
- View weekly download stats
- Copy install commands
- Direct links to documentation and npm

## Why I built this

I was building a Convex desktop application and found myself constantly alt-tabbing to the dashboard just to check logs and run seed functions. After doing this approximately 47 times too many, I decided to bring those features to Raycast. Tables got added because... well, I was already there.

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

1. Open "Run Function" command
2. Search for your function by name or type
3. Enter JSON arguments (if needed)
4. Press Enter to execute
5. View and copy results

### Browsing Tables

1. Open "Data" command
2. Select a table from the list
3. Browse documents with pagination
4. View full document details

## Keyboard Shortcuts

| Action            | Shortcut |
| ----------------- | -------- |
| Go back           | `⌘ [`    |
| Copy to clipboard | `⌘ C`    |
| Copy JSON         | `⌘ ⇧ C`  |
| Open in Dashboard | `⌘ O`    |
| Load more         | `⌘ L`    |

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
│   ├── switch-project.tsx    # Project switcher command
│   ├── run-function.tsx      # Function runner command
│   ├── browse-tables.tsx     # Table browser command
│   ├── lib/
│   │   ├── auth.ts           # OAuth device code flow
│   │   └── api.ts            # Convex API client
│   ├── hooks/
│   │   ├── useConvexAuth.ts  # Authentication hook
│   │   └── useConvexData.ts  # Data fetching hooks
│   └── components/
│       └── AuthGuard.tsx     # Authentication wrapper
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
