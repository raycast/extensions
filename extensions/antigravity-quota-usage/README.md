# Antigravity Quota Usage

A Raycast extension to check and sync your Antigravity AI agent quota usage status directly from your local environment.


## Features

- **Auto-Detection**: Automatically detects running Antigravity Language Server processes.
- **Smart Connection**: Probes multiple ports to find the active API, handling random port assignments and multiple IDE instances.
- **Detailed Quotas**: Displays usage per model with precise percentage and reset times.
- **Visual Feedback**:
  - **Dynamic Progress Icons**: Custom SVG icons that visually represent the exact remaining percentage.
  - **Color-Coded Status**: Green (>30%), Yellow (10-30%), and Red (<10%) indicators for quick health checks.
- **Sorting & Filtering**:
  - Sort by **Remaining %** (Critical First / Most First).
  - Sort by **Reset Time** (Soonest / Latest).
- **Grouping**: organizing models into logical groups based on shared quota pools.

## How It Works

1.  **Process Discovery**: The extension scans for running 'language_server' or 'antigravity' processes using `ps`.
2.  **Port Probing**: Since the server listens on random ports, it uses `lsof` to identify all active listening ports for the discovered process.
3.  **Authentication**: Extracts the local CSRF token from the process arguments to authenticate requests.
4.  **Data Fetching**: Probes found ports until a successful connection to the `GetUserStatus` endpoint is made.

## Troubleshooting

-   **"Could not detect Antigravity process"**: Ensure your IDE with Antigravity is running and recognized by the system.
-   **"Error Fetching Data"**: Use `Cmd + R` to reload or `Cmd + Shift + R` to clear cache and retry.
-   **No Data Shown**: The extension relies on local processes. If you just opened your IDE, it might take a moment for the language server to initialize.

## Development

### Tech Stack

-   **Platform**: [Raycast](https://raycast.com/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **UI Framework**: [React](https://react.dev/)

### Project Structure

-   `src/antigravity.tsx`: Main UI component handling the List view and interactions.
-   `src/lib/utils.ts`: Core logic for process detection, port probing (`lsof`), and API communication.

### Commands

-   `npm install`: Install dependencies.
-   `npm run dev`: Start the development server.