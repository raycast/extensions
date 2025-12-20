---
targets:
  - "*"
root: false
description: "Guidelines for always creating migration files before applying SQL database changes"
globs:
  - "**/*.sql"
  - "**/migrations/**/*"
  - "**/supabase/migrations/**/*"
  - "**/db/migrations/**/*"
  - "**/database/migrations/**/*"
cursor:
  alwaysApply: false
  globs:
    - "**/*.sql"
    - "**/migrations/**/*"
    - "**/supabase/migrations/**/*"
    - "**/db/migrations/**/*"
    - "**/database/migrations/**/*"
---

# SQL Migrations

**CRITICAL**: Always create a migration file before applying any SQL database changes, regardless of how small the change is. Never apply SQL changes directly to the database without first writing a migration file.

## Core Principle

Database migrations provide version control for database schema changes, enable reproducible deployments, and allow safe rollbacks. Applying changes directly to the database (even small ones) bypasses this critical safety mechanism and leads to:

- Loss of change history and audit trail
- Inability to reproduce database state across environments
- Difficulty rolling back changes when issues arise
- Schema drift between development, staging, and production environments
- Broken deployments when migrations are missing

## Required Workflow

### Step 1: Create Migration File First

**Before making any SQL changes**, create a migration file:

- **Supabase**: Create file in `supabase/migrations/` directory with timestamp prefix (e.g., `20240101120000_add_user_table.sql`)
- **Other SQL systems**: Create file in the appropriate migrations directory (e.g., `migrations/`, `db/migrations/`, `database/migrations/`)
- **Naming convention**: Use descriptive names with timestamps or sequential numbers
- **File format**: Use `.sql` extension

### Step 2: Write the Migration SQL

Write the complete SQL statements in the migration file:

- Include all DDL statements (CREATE, ALTER, DROP, etc.)
- Include all DML statements if needed (INSERT, UPDATE, DELETE for seed data)
- Add comments explaining the purpose of the migration
- Include both up and down migrations if your system supports it

### Step 3: Review the Migration

Before applying:

- Verify the SQL syntax is correct
- Ensure the migration is idempotent or includes proper checks
- Check that the migration doesn't conflict with existing schema
- Review for potential data loss or breaking changes

### Step 4: Apply the Migration

Only after the migration file is created and reviewed:

- Run the migration using the appropriate tool (Supabase CLI, migration runner, etc.)
- Verify the migration applied successfully
- Test that the changes work as expected

## Pattern Description

### Supabase Migration Pattern

```sql
-- Migration: Add user preferences table
-- Created: 2024-01-01
-- Description: Creates a new table to store user preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(50) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

### General Migration Pattern

```sql
-- Migration: [Brief description]
-- Created: [Date]
-- Description: [Detailed explanation]

-- Up migration
BEGIN;

-- Your SQL changes here
CREATE TABLE IF NOT EXISTS example_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;

-- Down migration (if supported)
-- BEGIN;
-- DROP TABLE IF EXISTS example_table;
-- COMMIT;
```

## Examples of What NOT to Do

❌ **Don't**: Apply SQL changes directly in Supabase SQL Editor without creating a migration file first

```
-- BAD: Running this directly in SQL Editor
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

❌ **Don't**: Make small changes "just this once" without migrations

```
-- BAD: "It's just adding one column, I'll skip the migration"
-- Directly running: ALTER TABLE posts ADD COLUMN published BOOLEAN;
```

❌ **Don't**: Create migration files after already applying changes

```
-- BAD: Applying changes first, then creating migration file
-- Step 1: Run SQL directly in database
-- Step 2: Create migration file (too late!)
```

❌ **Don't**: Skip migrations for "quick fixes" or "temporary changes"

```
-- BAD: "This is temporary, I'll fix it properly later"
-- Running SQL directly without migration
```

❌ **Don't**: Apply changes manually in production without migration files

```
-- BAD: Manually running SQL in production database
-- No migration file exists for this change
```

❌ **Don't**: Create empty or placeholder migration files

```
-- BAD: Creating migration file but leaving it empty or with TODO comments
-- supabase/migrations/20240101120000_add_column.sql
-- TODO: Add migration SQL here
```

## Examples of What TO Do

✅ **Do**: Always create migration file first, even for tiny changes

```sql
-- GOOD: Migration file created BEFORE applying
-- File: supabase/migrations/20240101120000_add_email_verified_column.sql

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.email_verified IS 'Indicates whether user email has been verified';
```

✅ **Do**: Use proper naming conventions for migration files

```
-- GOOD: Descriptive names with timestamps
supabase/migrations/20240101120000_add_user_preferences_table.sql
supabase/migrations/20240101130000_add_email_verification_column.sql
supabase/migrations/20240101140000_create_posts_table.sql
```

✅ **Do**: Include comments and documentation in migration files

```sql
-- GOOD: Well-documented migration
-- Migration: Create posts table with RLS policies
-- Created: 2024-01-01
-- Description: 
--   Creates a new posts table to store user-generated content.
--   Includes Row Level Security policies to ensure users can only
--   access their own posts.

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);
```

✅ **Do**: Make migrations idempotent when possible

```sql
-- GOOD: Idempotent migration using IF NOT EXISTS
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(50) DEFAULT 'light'
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);
```

✅ **Do**: Test migrations before applying to production

```sql
-- GOOD: Migration tested in development first
-- File: supabase/migrations/20240101120000_add_index.sql

-- Tested in local development environment
-- Verified: Index improves query performance by 10x
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at 
ON posts(user_id, created_at DESC);
```

✅ **Do**: Use version control for migration files

```
-- GOOD: Migration files committed to git
git add supabase/migrations/20240101120000_add_table.sql
git commit -m "Add migration: create user_preferences table"
```

## Common Pitfalls

- **"It's just a small change"**: Even tiny changes need migrations. A single column addition can break production if not properly tracked.
- **"I'll create the migration later"**: Creating migrations after applying changes defeats their purpose. Always create the file first.
- **"This is temporary"**: Temporary changes still need migrations. You can always roll them back later if needed.
- **"I'll remember what I changed"**: Memory is unreliable. Migration files provide a permanent record of all changes.
- **"Production is different"**: Schema drift between environments causes deployment failures. Migrations ensure consistency.
- **Skipping migrations for "quick fixes"**: Quick fixes often become permanent. Always use migrations.
- **Applying migrations out of order**: Follow timestamp or sequential ordering to maintain consistency.

## Migration File Naming Conventions

### Supabase

- Format: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Example: `20240101120000_add_user_preferences_table.sql`
- Location: `supabase/migrations/`

### Other Systems

- Format varies by framework, but typically:
  - Timestamp-based: `20240101120000_description.sql`
  - Sequential: `001_add_table.sql`, `002_add_column.sql`
  - Date-based: `2024-01-01-description.sql`
- Location: `migrations/`, `db/migrations/`, or `database/migrations/`

## Summary

1. **Always create migration file first** - Never apply SQL changes directly without a migration file
2. **Even small changes need migrations** - Every database change, no matter how minor, requires a migration
3. **Use descriptive naming** - Migration files should clearly indicate what they do
4. **Include documentation** - Add comments explaining the purpose and context of migrations
5. **Make migrations idempotent** - Use `IF NOT EXISTS` and similar constructs when possible
6. **Test before production** - Always test migrations in development/staging first
7. **Version control migrations** - Commit migration files to git for tracking and collaboration
8. **Never skip migrations** - There's no exception for "quick fixes" or "temporary changes"

