# Prisma Postgres

Create a [Prisma Postgres](https://www.prisma.io/postgres?utm_source=raycast&utm_medium=prisma-postgres) database in seconds, straight from Raycast. You don't need an account or any setup, and every database comes with a connection string you can use right away.

Prisma Postgres is managed Postgres for TypeScript and AI apps. It's part of the Prisma platform, together with [Prisma Compute](https://www.prisma.io/compute?utm_source=raycast&utm_medium=prisma-postgres) to host your app (Node.js, Bun or Next.js) next to the database and [Prisma ORM](https://www.prisma.io/orm?utm_source=raycast&utm_medium=prisma-postgres) for type-safe queries and migrations. Any Postgres client works too.

## Commands

- **Create Database**: Creates a new Prisma Postgres database in your default region and shows its connection string and claim URL.
- **List Databases**: Shows the databases you created from Raycast, with connection strings, time left before they expire, and claim URLs.

## Preferences

- **Default Region**: The region new databases are created in (defaults to US East, N. Virginia).

## Keeping a database

Databases created from Raycast are deleted after 24 hours unless you claim them. Open the claim URL and sign in with a free Prisma account to keep the database. The Free plan includes 200,000 operations a month and 2 GB of storage, with no credit card needed. See [pricing](https://www.prisma.io/pricing?utm_source=raycast&utm_medium=prisma-postgres) for paid plans.

## Learn more

- [Prisma Postgres docs](https://www.prisma.io/docs/postgres)
- [Raycast integration docs](https://www.prisma.io/docs/postgres/integrations/raycast)
- [Prisma MCP server](https://www.prisma.io/docs/ai/tools/mcp-server): manage Prisma Postgres databases and Prisma Compute apps from AI tools at `https://mcp.prisma.io/mcp`
- [`create-db` CLI](https://www.npmjs.com/package/create-db): the same instant databases from your terminal with `npx create-db`
