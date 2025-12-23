# Daily Poll - Raycast Extension

A Raycast extension for daily polls with anonymous voting using Supabase.

## Features

- One global daily poll that all users see
- Anonymous voting (device-based hashing)
- Vote once per day (enforced)
- Automatic poll reset at 12:00 AM Eastern Time
- View results immediately after voting
- Browse previous poll results

## Setup

### 1. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema in `database/schema.sql` (see `database/README.md` for details)
3. Seed some initial polls in the `polls` table

### 2. Extension Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Supabase credentials in Raycast:
   - Open Raycast preferences
   - Go to Extensions → Daily Poll
   - Enter your Supabase URL (from Supabase Settings → API → Project URL)
   - Enter your Supabase Anon Key (from Supabase Settings → API → anon public key)

### 3. Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## How It Works

- **Anonymous Identity**: Each device generates a UUID stored locally, which is SHA-256 hashed before sending to the backend
- **Timezone Handling**: All poll dates are determined server-side using Eastern Time via PostgreSQL's `get_et_date()` function
- **Vote Enforcement**: Database unique constraint on `(poll_date, user_hash)` ensures one vote per user per day
- **Poll Structure**: Each poll has a `poll_date` (YYYY-MM-DD), `question`, and `options` (JSON array of strings)

## Database Schema

- `polls`: Stores poll questions and options
- `votes`: Stores anonymous votes with option_index
- `get_et_date()`: PostgreSQL function returning current date in ET timezone

See `database/README.md` for detailed setup instructions.

