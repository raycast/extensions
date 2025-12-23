# Quick Start - Configure Your Extension

## Your Supabase Credentials

- **Project URL**: `https://jmlflqkeqlwjmgzxmbne.supabase.co`
- **API Key**: You provided a "Publishable API Key", but we need the **anon key**

## Finding the Correct Key

1. Go to your Supabase Dashboard
2. Click **Settings** (gear icon) → **API**
3. Look for **"anon public"** key (not "publishable")
   - It should be a long JWT token starting with `eyJ...`
   - This is the key that's safe to use in client-side code with RLS enabled

## Configure Raycast

1. **Install dependencies** (if you haven't):
   ```bash
   cd raycast-poll
   npm install
   ```

2. **Open Raycast Preferences**:
   - Press `Cmd + ,` in Raycast
   - Go to **Extensions** → **Daily Poll**

3. **Enter your credentials**:
   - **Supabase URL**: `https://jmlflqkeqlwjmgzxmbne.supabase.co`
   - **Supabase Anon Key**: Paste your anon public key (the `eyJ...` one)

## Seed Today's Poll

Run this in Supabase SQL Editor:

```sql
INSERT INTO polls (poll_date, question, options)
VALUES 
  (get_et_date(), 'Is cereal soup?', '["Yes", "No", "Chaos"]'::jsonb);
```

## Test It!

1. In Raycast, type "Daily Poll"
2. You should see today's poll
3. Vote and see results!

