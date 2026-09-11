# DB Schema Explorer

Get database schema (tables, columns, relations) from PostgreSQL and MongoDB for AI reference and context. Perfect for quickly accessing table structures, copying DDL statements, and providing database context to AI assistants.

## Features

- **Multi-Database Support**: Connect to PostgreSQL and MongoDB databases
- **Schema Caching**: Fetch and cache database schemas locally for fast access
- **Table Exploration**: Browse tables organized by schema with search functionality
- **DDL Export**: Copy individual table DDL or combine multiple tables into a single schema
- **Exclusion Rules**: Filter out unwanted tables using regex, contains, or does-not-contain patterns
- **Default Database**: Set a default database for quick access
- **Table Name Display Options**: Show full schema.table names or table names only

## Installation

1. **Install Raycast** (if you haven't already)
   - Download from [raycast.com](https://raycast.com)
   - Or install via Homebrew: `brew install --cask raycast`

2. **Install the Extension**
   - Open Raycast (⌘ Space)
   - Type "Extensions" and select "Store"
   - Search for "DB Schema Explorer"
   - Click "Install"

   Or install manually:

   ```bash
   git clone <repository-url>
   cd "<repository-directory>/extensions/db-schema-explorer"
   npm install
   npm run build
   ```

3. **Configure Your First Database**
   - Open Raycast and search for "Manage Databases"
   - Click "Add Database"
   - Enter a name, select database type (Postgres or MongoDB), and provide connection string
   - Click "Add Database"

## Usage

### Managing Databases

**Command**: `Manage Databases`

Add, edit, and configure database connections:

1. **Add a Database**
   - Click "Add Database" in the action panel
   - Enter a descriptive name (e.g., "Production DB")
   - Select database type: Postgres or MongoDB
   - Enter connection string:
     - Postgres: `postgresql://user:password@host:5432/database`
     - MongoDB: `mongodb://localhost:27017/dbname` or `mongodb+srv://user:password@cluster.mongodb.net/dbname`
   - Click "Add Database"

2. **Configure Exclusion Rules**
   - Select a database from the list
   - Click "Add Exclusion Rule"
   - Choose rule type:
     - **Regex match**: Use regex patterns (e.g., `^hdb_catalog\..*`)
     - **Contains**: Tables containing the pattern (e.g., `hdb_catalog`)
     - **Does not contain**: Tables not containing the pattern
   - Enter pattern and save

3. **Set Default Database**
   - Select a database
   - Click "Set as Default" to make it the default for Explore Tables

4. **Sync Schema**
   - Select a database
   - Click "Sync Schema" to fetch and cache the database schema
   - The schema is stored locally for fast access

### Syncing Schema

**Command**: `Sync Schema`

Fetch the latest schema from your database:

1. If you have one database, it will automatically start syncing
2. If you have multiple databases, select the one to sync
3. Wait for the sync to complete
4. The schema is now cached and ready to explore

**Note**: You need to sync the schema before you can explore tables. The schema is cached locally, so you only need to sync when the database structure changes.

### Exploring Tables

**Command**: `Explore Tables`

Browse and copy table DDL statements:

1. **Browse Tables**
   - Tables are organized by schema
   - Use the search bar to filter tables by name
   - Select a database from the dropdown (if you have multiple)

2. **View Table DDL**
   - Click on any table to see its DDL in the detail view
   - The DDL shows the complete table structure including columns, types, constraints, and indexes

3. **Copy DDL**
   - **Single Table**: Select a table and press Enter or click "Copy DDL"
   - **Multiple Tables**:
     - Select tables using "Add to Selection" (or ⌘+Click)
     - Press ⌘⇧Enter to copy combined DDL of selected tables
   - **Full Schema**: Use "Copy Full Schema" to copy DDL for all tables

4. **Bulk Selection**
   - "Add All to Selection": Select all visible tables
   - "Add Schema to Selection": Select all tables in a schema
   - "Remove Schema from Selection": Deselect all tables in a schema
   - "Clear Selection": Clear all selections

## Usage Examples

### Example 1: Quick Schema Reference

1. Open "Explore Tables"
2. Search for a table name (e.g., "users")
3. Press Enter to copy the DDL
4. Paste into your AI assistant or documentation

### Example 2: Export Multiple Related Tables

1. Open "Explore Tables"
2. Select tables related to a feature (e.g., "users", "user_profiles", "user_sessions")
3. Press ⌘⇧Enter to copy combined DDL
4. Use for AI context or documentation

### Example 3: Filter Out System Tables

1. Open "Manage Databases"
2. Select your database
3. Add exclusion rule: Type "Contains", Pattern "hdb_catalog"
4. This filters out Hasura system tables from Explore Tables

### Example 4: Working with Multiple Databases

1. Add multiple databases in "Manage Databases"
2. Set one as default for quick access
3. Use the dropdown in "Explore Tables" to switch between databases
4. Each database maintains its own exclusion rules and sync status

## Connection String Formats

### PostgreSQL

```
postgresql://[user[:password]@][host][:port][/database][?param1=value1&...]
```

Examples:

- `postgresql://user:password@localhost:5432/mydb`
- `postgresql://user@localhost/mydb` (no password)
- `postgresql://user:password@example.com:5432/mydb?sslmode=require`

### MongoDB

```
mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[database][?options]]
mongodb+srv://[username:password@]host[/[database][?options]]
```

Examples:

- `mongodb://localhost:27017/mydb`
- `mongodb://user:password@localhost:27017/mydb`
- `mongodb+srv://user:password@cluster.mongodb.net/mydb`

## Screenshots

![Sync Schema](metadata/db-schema-explorer-1.png)

_Sync database schemas to cache them locally for fast access_

![Explore Tables](metadata/db-schema-explorer-2.png)

_Browse tables, view DDL, and copy schema information_

![Table Details](metadata/db-schema-explorer-3.png)

_View detailed table structure and copy DDL statements_

## Requirements

- Raycast (macOS or Windows)
- Node.js 18+ (for development)
- Access to PostgreSQL or MongoDB databases

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## License

MIT

## Author

scisaif
