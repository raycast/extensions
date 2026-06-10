# Development Guide

> [!IMPORTANT]
>
> **Do not submit Pull Requests directly to the `raycast/extensions` repository!**
>
> This extension is actively maintained in this standalone repository. Any PRs submitted directly to the official Raycast repository might be overwritten by our automated CI/CD synchronization or cause conflicts. Please submit all PRs to this repository (`maxchang3/raycast-bangumi`) instead.

## Prerequisites

Before you start, make sure you have installed:

- [Node.js](https://nodejs.org/) (v24 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Raycast](https://raycast.com/)

## Local Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/maxchang3/raycast-bangumi.git
   cd bangumi
   ```

2. **Install dependencies:**

   ```bash

   npm install
   ```

3. **Start development mode:**
   ```bash
   npm run dev
   ```
   This will start the local development server. Open Raycast, and you will see the local version of the Bangumi extension available for testing. Changes to the source code will hot-reload automatically.

## Type Generation

This repository uses [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) along with `openapi-typescript` to provide a fully type-safe API client.

Instead of manually maintaining TypeScript interfaces for API requests and responses, we generate them directly from the official Bangumi OpenAPI specification.

If the Bangumi API introduces new endpoints or fields, you can fetch the latest schema and update the types by running:

```bash
npm run generate-types
```

This command downloads the latest schema from `https://bangumi.github.io/api/dist.json` and updates `src/types/generated.ts`. The `openapi-fetch` client will automatically pick up these changes to ensure all API calls remain type-safe.

## CI/CD & Publishing Workflows

Because this extension is maintained in a standalone repository but ultimately published to the official Raycast store, we use a customized GitHub Actions setup to handle synchronization between repositories.

### 1. Publishing to Raycast (`publish-raycast.yml`)

When a new GitHub Release is created (usually by merging a `release-please` PR), this workflow automates the submission to the Raycast Store:

- **Smart CHANGELOG Processing:** It automatically replaces the local generation date in the newest `CHANGELOG.md` entry with `{PR_MERGE_DATE}` (required by Raycast) without corrupting historical dates.
- **Path Filtering:** It securely ignores local-only configurations (like `.vscode`, `.github`, `release-please` configs, and `skills-lock.json`).
- **Automated PR Creation:** It pushes the sanitized code to the maintainer's fork (`maxchang3/extensions`) and opens a Pull Request on the official `raycast/extensions` repository.

### 2. Pulling Upstream Changes (`pull-raycast-changes.yml`)

Occasionally, the Raycast team or community contributors might push changes directly to this extension in the central `raycast/extensions` repository (e.g., core API migrations, security patches). This scheduled workflow ensures we stay in sync:

- **Scheduled Syncing:** Runs automatically every day to check for upstream modifications.
- **Safe Merging:** It automatically filters out upstream `CHANGELOG.md` and `.github/` directories to prevent conflicts with our local `release-please` tracking.
- **Automated PR Creation:** If upstream changes are detected, it opens a Pull Request in this repository so they can be reviewed and merged safely.
