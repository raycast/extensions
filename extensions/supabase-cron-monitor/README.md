# Supabase Cron Monitor (Raycast Extension)

Monitor Supabase `pg_cron` jobs and run history directly in Raycast.

## Requirements
- Supabase project with `pg_cron` enabled
- Service role key (used to query wrapper views / RPC functions)

## Setup
1. Run the SQL migration in `assets/001_setup_cron_monitoring.sql` in your Supabase SQL editor.
   - This creates `public.cron_job`, `public.cron_job_run_details`, and RPC fallbacks.
2. Open Raycast → Extensions → Supabase Cron Monitor → Preferences.
3. Fill in:
   - **Supabase URL** (e.g. `https://your-project.supabase.co`)
   - **Service Role Key**
4. Launch the commands:
   - **Cron Jobs** – list jobs with status and last run
   - **Cron Runs** – browse recent run history

## Commands
- **Cron Jobs** (`cron-jobs`): list jobs, view details, and open per-job run history.
- **Cron Runs** (`cron-runs`): browse recent runs across all jobs.
- **Menubar Supabase Cron Monitor** (`menubar-cron-monitor`): live cron health and actions in the menu bar.

## Helpful Actions
- Open Supabase SQL editor
- Copy setup SQL to clipboard
- Refresh data

## Screenshots (Raycast Store)
Save screenshots to `metadata/screenshots/` with Raycast's Window Capture tool.

Recommended set (2000×1250 PNG):
1. `metadata/screenshots/01-cron-jobs.png` – list view with detail panel open
2. `metadata/screenshots/02-job-history.png` – per-job run history
3. `metadata/screenshots/03-recent-runs.png` – global recent runs command

Tip: Use Raycast → Window Capture → Save to Metadata to ensure consistent backgrounds.

## Development
```bash
npm install
npm run dev
```

## Security
The service role key is powerful. Use a dedicated project and keep it private.
