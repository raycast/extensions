# MySQL Client

Connect to your MySQL, MariaDB, or Aurora MySQL databases from Raycast — keyboard-first.

## Features

- **Run Query** — run any SQL and view the results as a table (copy as JSON / CSV).
- **Command Palette** — common commands (Show Databases, Process List, Status, Variables…).
- **Browse Schema** — drill through databases → tables → columns, or select the top 100 rows.
- **Query History** — re-run recent queries and keep favorites (last 100).
- **Manage Connections** — save multiple profiles (host / port / user / password / database / SSL) and pick a default.

## Setup

Open **Manage Connections** and add a database: host, port (default `3306`), user, password, and optionally a default database. Choose an **SSL** mode:

- **Off** — plain connection.
- **Require (verify certificate)** — TLS with certificate validation.
- **Require (skip verification)** — TLS without validation, for self-signed certificates.

Use **Test Connection** to confirm it works. If you only use a single database, you can instead fill in the extension preferences as a fallback.

### Security

Connection details — including passwords — are stored in Raycast's local encrypted database (`LocalStorage`) and only used to connect to the databases you configure.
