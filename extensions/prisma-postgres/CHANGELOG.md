# Prisma Postgres Changelog

## [Prisma Platform Refresh] - 2026-11-25

- Read connection strings from the Management API's `connections[].endpoints` field, with a fallback to the deprecated `apiKeys[].directConnection` field.
- Show a clear error (including rate limits) instead of an endless loading screen when a database can't be created.
- Update the icon to the current Prisma logo.
- Refresh the copy: the Free plan includes 200,000 operations a month and 2 GB of storage, and you can host your app next to the database on [Prisma Compute](https://www.prisma.io/compute?utm_source=raycast&utm_medium=prisma-postgres) and query it with [Prisma ORM](https://www.prisma.io/orm?utm_source=raycast&utm_medium=prisma-postgres). Learn more about [Prisma Postgres](https://www.prisma.io/postgres?utm_source=raycast&utm_medium=prisma-postgres).

## [Initial Version] - 2025-11-21

- Add Create Database command for instant Prisma Postgres instances.
- Add List Databases command with detail view and quick actions.
- Provide Default Region preference.
