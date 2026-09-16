# PostgreSQL Client

Run queries against your PostgreSQL databases from Raycast, browse the schema, and let Raycast AI answer questions about your data.

## Commands

**Run Query** runs a statement against the selected connection. You can page through the result as a table, JSON, or CSV.

**Browse Schema** shows schemas, tables, columns, primary keys, foreign keys, and indexes, including which indexes have never been used.

**Query History** keeps every statement you ran, whether from a command or from AI. Re-run it, or pin it as a favorite.

**Manage Connections** holds your connection profiles. It has a test action and a pick for the active one.

## AI Extension

Ask Raycast AI about your database in plain language, for example `@postgres how many users signed up last week?`, and it will look up the schema, write the SQL, and run it.

The tools it can use:

| Tool | What it does |
| --- | --- |
| `get-schema` | Tables, columns, types, keys, indexes, foreign keys |
| `run-read-query` | Runs a read-only statement and returns the rows |
| `run-write-query` | Runs a changing statement, and always asks you first |
| `explain-query` | Query plan, optionally with real execution timings |
| `find-slow-queries` | The slowest statements according to `pg_stat_statements` |
| `list-connections` | Which databases are configured and which one is active |

### Which database a question hits

By default every tool runs against the connection you marked active in **Manage Connections**, so an ordinary question stays with what you picked in the UI.

When a request names a database or an environment, as in "how many users are on staging?", the model may pass a `connection` argument instead. That argument is matched against the profile name first and the database name second. An unknown name is rejected outright rather than falling back to the active connection, so a bad guess fails loudly instead of answering from the wrong database.

Writes aimed at a connection other than the active one say so in the confirmation dialog, on their own line, above the statement.

### How reads are kept read-only

A statement only runs without asking you when it passes two independent gates.

1. **Classification.** The statement has to start with a read verb and contain no write keyword, no `SELECT ... INTO`, and no second statement. Comments and string literals are stripped first, dollar-quoted blocks included, so a keyword hidden inside a quoted value counts as data rather than as SQL. Anything ambiguous counts as a write.
2. **The server.** The statement then runs inside a `BEGIN TRANSACTION READ ONLY`. If the classification was wrong, say a write reached through a function or a trigger, PostgreSQL refuses it instead of applying it.

Anything that is not clearly a read goes through `run-write-query`, which always shows you the connection and the full statement before it runs.

## Setup

Add a connection with **Manage Connections**. For a single local database you can instead put a `postgresql://user:password@localhost:5432/postgres` URL in the extension preferences. That URL is used only while no profile exists.

Two preferences are worth knowing about.

**Statement Timeout** is the number of milliseconds before the server cancels a statement, 15000 by default. It applies to AI tools too, so a runaway query cannot hang your session.

**Row Limit** is how many rows are kept from a result, 500 by default. The statement itself is not rewritten, so the timeout above is what stops a runaway query, while this caps what gets rendered or handed onward. AI tools additionally cap the rows given to the model at 100 so a wide result does not fill the context window.

`find-slow-queries` needs the `pg_stat_statements` extension on the server. Without it the tool says so rather than failing.
