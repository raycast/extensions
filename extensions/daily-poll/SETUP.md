# Quick Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **API**
3. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 2: Install Dependencies

```bash
cd raycast-poll
npm install
```

## Step 3: Configure Raycast Extension

1. Open **Raycast** app
2. Press `Cmd + ,` to open Preferences
3. Go to **Extensions** → **Daily Poll**
4. Enter your credentials:
   - **Supabase URL**: Paste your Project URL
   - **Supabase Anon Key**: Paste your anon public key

## Step 4: Seed Today's Poll

You need to create a poll for today's date. Run this SQL in your Supabase SQL Editor:

```sql
-- Get today's date in ET (for reference)
SELECT get_et_date();

-- Insert a poll for today (replace the date with the result from above)
INSERT INTO polls (poll_date, question, options)
VALUES 
  (get_et_date(), 'Is cereal soup?', '["Yes", "No", "Chaos"]'::jsonb);
```

Or use the Table Editor:
1. Go to **Table Editor** → `polls`
2. Click **Insert row**
3. Fill in:
   - `poll_date`: Use today's date in YYYY-MM-DD format (e.g., "2025-01-15")
   - `question`: Your poll question
   - `options`: JSON array like `["Option 1", "Option 2", "Option 3"]`

## Step 5: Test the Extension

1. In Raycast, type "Daily Poll" and select the command
2. You should see today's poll with voting options
3. Vote on an option
4. You should see the results immediately

## Troubleshooting

**"No poll available" error:**
- Make sure you created a poll with today's date (in ET timezone)
- Check that `poll_date` matches the result of `SELECT get_et_date();`

**Connection errors:**
- Verify your Supabase URL and anon key are correct
- Check that RLS policies allow public reads (they should from the schema)

**Vote not working:**
- Check the browser console or Raycast logs for errors
- Verify the `votes` table was created correctly

