# Database Setup Instructions

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from Settings → API

## Setup Steps

### 1. Run the Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Click "Run" to execute

This will create:
- `polls` table
- `votes` table
- `get_et_date()` PostgreSQL function
- Indexes and RLS policies

### 2. Seed Initial Polls

You can seed polls using the Supabase SQL Editor or the Table Editor. Here's an example SQL to insert a poll:

```sql
INSERT INTO polls (poll_date, question, options)
VALUES 
  ('2025-01-10', 'Is cereal soup?', '["Yes", "No", "Chaos"]'::jsonb),
  ('2025-01-11', 'What is the best programming language?', '["TypeScript", "Python", "Rust", "Go"]'::jsonb);
```

Or use the Table Editor:
1. Go to Table Editor → `polls`
2. Click "Insert row"
3. Fill in:
   - `poll_date`: YYYY-MM-DD format (e.g., "2025-01-10")
   - `question`: Your poll question
   - `options`: JSON array of strings (e.g., `["Option 1", "Option 2", "Option 3"]`)

### 3. Configure Raycast Extension

1. Open Raycast preferences
2. Go to Extensions → Daily Poll
3. Enter your Supabase URL (from Settings → API → Project URL)
4. Enter your Supabase Anon Key (from Settings → API → anon public key)

## Notes

- Polls reset automatically at 12:00 AM Eastern Time based on the `get_et_date()` function
- Users can only vote once per day (enforced by unique constraint on `poll_date` + `user_hash`)
- Votes are anonymous (only hashed device IDs are stored)

