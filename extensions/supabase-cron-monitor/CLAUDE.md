# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Supabase Cron Monitor is a Raycast extension that monitors `pg_cron` jobs and run history for a Supabase project. It exposes two list commands (Cron Jobs, Cron Runs) plus a menu bar monitor with health roll-up, quick actions, and optional notifications for failures.

## Essential Commands

- `npm run dev` - Start Raycast development mode
- `npm run build` - Build the extension
- `npm run lint` - Run Raycast lint (ESLint + Prettier + TS checks)

If npm cache permissions cause errors, use:
```
NPM_CONFIG_CACHE=/tmp/npm-cache npx ray lint
```

## Entry Points

- `src/cron-jobs.tsx` - Main Cron Jobs list view with job details and actions
- `src/cron-runs.tsx` - Recent runs list view
- `src/menubar-cron-monitor.tsx` - Menu bar summary/quick actions

## Architecture Notes

- **Supabase client + data access:** `src/supabase.ts`
  - `fetchCronJobs` reads from `cron_job` view, falls back to RPC if missing.
  - `fetchLastRun`, `fetchJobRuns`, `fetchRecentRuns` read from `cron_job_run_details` view, fall back to RPC.
  - `getSqlEditorUrl` and `getDashboardUrl` build Supabase Dashboard links.
- **Setup SQL:**
  - `src/setupSql.ts` is the inline SQL string (shown to users).
  - `assets/001_setup_cron_monitoring.sql` is the standalone migration asset.
- **Error handling:** `src/errors.ts` defines MissingSetupError and user-facing guidance.
- **Status formatting:** `src/utils.ts` computes job status and formatting helpers.

## Supabase Requirements

The extension expects the SQL objects created by the setup script:
- `cron_job` view
- `cron_job_run_details` view
- RPC functions: `list_cron_jobs`, `get_last_job_run`, `get_cron_job_runs`

If missing, the UI shows the setup guidance and offers “Copy Setup Sql”.

## Menu Bar Behavior

- Shows health roll-up: “All healthy / X failing / Y running”.
- Uses `LocalStorage` to toast failures **once** until resolved.
- Preferences (menu bar command):
  - `menuBarRefreshMinutes` (default 5)
  - `menuBarJobFilter` (all / active / failing)
  - `customIconUrl`

## User Preferences

Global extension preferences (required):
- `supabaseUrl`
- `serviceRoleKey` (stored securely)

Optional:
- `autoRefreshMinutes` (list views)
- `runHistoryLimit`

## UI/Style Notes

- Icon assets must be **512x512** PNGs (`assets/icon.png`, `assets/icon@dark.png`).
- Action titles should use Title Case (Raycast lint rule).

