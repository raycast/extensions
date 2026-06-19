## Getting Started

1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the Raycast development environment.

## Testing

1. Make sure Gram is installed.



2. Locate the SQLite3 database file for Gram, e.g.:

   `/Users/<username>/Library/Application Support/Gram/db/0-stable/db.sqlite` - Gram Stable MacOS



3. Check the latest applied migration for `WorkspaceDb`:

   ```shell
   sqlite3 --readonly "/Users/<username>/Library/Application Support/Gram/db/0-stable/db.sqlite" "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';"
   34
   ```

   Minimum supported version - **30** (as of 2026-04-15)


4. Generate the test database files:

   ```shell
   ./scripts/create-fixtures.sh "/Users/<username>/Library/Application Support/Gram/db/0-stable/db.sqlite" 30
   ./scripts/create-fixtures.sh "/Users/<username>/Library/Application Support/Gram/db/0-stable/db.sqlite" 39
   ```

   Note: The v29 fixture is used to test unsupported version detection.


5. Run the unit tests:

   ```shell
   npm run test
   ```
   Note: Integration tests that require fixtures will be automatically skipped if the fixture files don't exist.

## If Gram Database Schema Update Is Needed

If the Gram database schema gets updated, new tests need to be added:

1. Get the latest applied migration for `WorkspaceDb`:

   ```shell
   sqlite3 --readonly "/Users/<username>/Library/Application Support/Gram/db/0-stable/db.sqlite" "SELECT MAX(step) FROM migrations WHERE domain = 'WorkspaceDb';"
   34
   ```

   Let's say migration **34** adds breaking changes.

2. Implement schema update support in `db.ts`.

3. Add a new sample data script file `scripts/add-sample-data-34.sql`.

4. Add a new section `v34 Schema` to `db.test.ts`.

5. Run tests `npm run test` and update snapshots.