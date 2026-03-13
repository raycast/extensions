export const details = {
  version: `
# version (-v)

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#version--v

The \`version\` command outputs information about your current \`prisma\` version, platform, and engine binaries.

## Options
The \`version\` command recognizes the following options to modify its behavior:

| Option     | Required | Description                                 |
|------------|----------|---------------------------------------------|
| \`--json\` | No       | Outputs version information in JSON format. |

`,
  init: `
# init

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#init

Bootstraps a fresh Prisma project within the current directory.

The \`init\` command does not interpret any existing files. Instead, it creates a \`prisma\` directory containing a bare-bones \`schema.prisma\` file within your current directory.

## Arguments

| Argumnet                  | Required | Description                                                                                                                                            | Default        |
|---------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------|----------------|
| \`--datasource-provider\` | No       | Specifies the default value for the provider field in the datasource block. Options are sqlite, postgresql, mysql, sqlserver, mongodb and cockroachdb. | \`postgresql\` |
| \`--url\`                 | No       | Define a custom datasource url.                                                                                                                        |                |
`,
  generate: `
# generate

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#generate

The \`generate\` command generates assets like Prisma Client based on the generator and data model blocks defined in your \`prisma/schema.prisma\` file.

The \`generate\` command is most often used to generate Prisma Client with the \`prisma-client-js\` generator. This does three things:

1. Searches the current directory and parent directories to find the applicable npm project. It will create a \`package.json\` file in the current directory if it cannot find one.
2. Installs the \`@prisma/client\` into the \`npm\` project if it is not already present.
3. Inspects the current directory to find a Prisma schema file to process. It will then generate a customized Prisma Client for your project.

## Prerequisites

To use the \`generate\` command, you must add a generator definition in your schema.prisma file. The \`prisma-client-js\` generator, used to generate Prisma Client, can be added by including the following in your \`schema.prisma\` file:

\`\`\`
generator client {
  provider = "prisma-client-js"
}
\`\`\`

## Option

| Option           | Required | Description                                                                                                                                                                                                                   | Default |
|------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| \`--data-proxy\` | No       | The \`generate\` command will generate Prisma Client for use with the Data Proxy. Mutually exclusive with \`--accelerate\` and \`--no-engine.\`                                                                               |         |
| \`--accelerate\` | No       | The \`generate\` command will generate Prisma Client for use with Accelerate. Mutually exclusive with \`--data-proxy\` and \`--no-engine\`. Available in Prisma 5.1.0 and later.                                              |         |
| \`--no-engine\`  | No       | The \`generate\` command will generate Prisma Client without an accompanied engine for use with Data Proxy or Accelerate. Mutually exclusive with \`--data-proxy\` and \`--accelerate\`. Available in Prisma 5.2.0 and later. |         |
| \`--watch\`      | No       | The \`generate\` command will continue to watch the \`schema.prisma\` file and re-generate Prisma Client on file changes.                                                                                                     |         |

> *Deprecation Warning*
As of Prisma 5.2.0, \`--data-proxy\` and \`--accelerate\` are deprecated in favor of \`--no-engine\` as Prisma Client no longer requires an option to work with Accelerate or Data Proxy. All options are available and work similarly, but we recommend \`--no-engine\` as it prevents an engine from being downloaded which will greatly impact the size of apps deployed to serverless and edge functions.

## Arguments

| Argument        | Required | Description                                                                                                                                                                                  | Default                                 |
|-----------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| \`--schema\`    | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported.                                        | ./schema.prisma, ./prisma/schema.prisma |
| \`--generator\` | No       | Specifies which generator to use to generate assets. This option may be provided multiple times to include multiple generators. By default, all generators in the target schema will be run. |                                         |
`,
  introspect: `
# introspect

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#introspect

> *Deprecation warning*
From Prisma 3.0.0 onwards, the prisma introspect command is deprecated and replaced with the prisma db pull command.

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#introspect 

## Arguments

| Argument        | Required | Description                                                                                                                                                                                  | Default                                 |
|-----------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| \`--schema\`    | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported.                                            | ./schema.prisma, ./prisma/schema.prisma |

`,
  validate: `
# validate

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#validate

Validates the Prisma Schema Language of the Prisma schema file.

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#validate

## Arguments

| Argument        | Required | Description                                                                                                                                                                                  | Default                                 |
|-----------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| \`--schema\`    | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported.                                            | ./schema.prisma, ./prisma/schema.prisma |
  
`,
  format: `
# format

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#format

Formats the Prisma schema file, which includes validating, formatting, and persisting the schema.

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#format

## Arguments

| Argument        | Required | Description                                                                                                                                                                                  | Default                                 |
|-----------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| \`--schema\`    | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported.                                        | ./schema.prisma, ./prisma/schema.prisma |

  `,
  dbPull: `
# db pull

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#db-pull

The db pull command connects to your database and adds Prisma models to your Prisma schema that reflect the current database schema.

> Warning: The command will overwrite the current schema.prisma file with the new schema. Some manual changes or customization can be lost. Be sure to back up your current schema.prisma file (or commit your current state to version control to be able to revert any changes) before running db pull if it contains important modifications.

> Introspection with the db pull command on the MongoDB connector samples the data instead of reading a schema.

## Prerequisites

Before using the \`db pull\` command, you must define a valid datasource within your \`schema.prisma\` file.

For example, the following datasource defines a SQLite database file within the current directory:

\`\`\`
datasource db {
  provider = "sqlite"
  url      = "file:my-database.db"
}
\`\`\`

## Options
The version command recognizes the following options to modify its behavior:

| Option      | Required | Description                                                                                                           | Default |
|-------------|----------|-----------------------------------------------------------------------------------------------------------------------|---------|
| \`--force\` | No       | Force overwrite of manual changes made to schema. The generated schema will be based on the introspected schema only. |         |
| \`--print\` | No       | Prints the created   schema.prisma  to the screen instead of writing it to the filesystem.                            |         |

## Arguments

| Argument     | Required | Description                                                                                                                                           | Default                                         |
|--------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| \`--schema\` | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported. | \`./schema.prisma\`, \`./prisma/schema.prisma\` |
`,
  dbPush: `
# db push

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#db-push

The \`db push\` command pushes the state of your Prisma schema file to the database without using migrations. It creates the database if the database does not exist.

This command is a good choice when you do not need to version schema changes, such as during prototyping and local development.

## Prerequisites

Before using the \`db push\` command, you must define a valid datasource within your \`schema.prisma\` file.

For example, the following \`datasource\` defines a SQLite database file within the current directory:

\`\`\`
datasource db {
  provider = "sqlite"
  url      = "file:my-database.db"
}
\`\`\`

## Options

| Option                 | Required | Description                                                                                                                |
|------------------------|----------|----------------------------------------------------------------------------------------------------------------------------|
| \`--skip-generate\`    | No       | Skip generation of artifacts such as Prisma Client                                                                         |
| \`--force-reset\`      | No       | Resets the database and then updates the schema - useful if you need to start from scratch due to unexecutable migrations. |
| \`--accept-data-loss\` | No       | Ignore data loss warnings. This option is required if as a result of making the schema changes, data may be lost.          |
| \`--help\`/\`--h\`     | No       | Displays the help message                                                                                                  |

## Arguments

| Argument     | Required | Description                                                                                                                                           | Default                                         |
|--------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| \`--schema\` | No       | Specifies the path to the desired schema.prisma file to be processed instead of the default path. Both absolute and relative paths are supported.     | \`./schema.prisma\`, \`./prisma/schema.prisma\` |
`,
  dbSeed: `
# db seed

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#db-seed

Seed your database using Prisma Client and Prisma's integrated seeding functionality

## Options

| Option             | Required | Description                                               |
|--------------------|----------|-----------------------------------------------------------|
| \`--help\`/\`--h\` | No       | Displays the help message                                 |
| \`--\`             | No       | Allows the use of custom arguments defined in a seed file |
`,
  dbExecute: `
# db execute

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#db-execute

> The \`db execute\` command is Generally Available in versions 3.13.0 and later. If you're using a version between 3.9.0 and 3.13.0, it is available behind a \`--preview-feature\` CLI flag.

> This command is currently not supported on MongoDB.

This command applies a SQL script to the database without interacting with the Prisma migrations table. The script takes two inputs:

the SQL script, which can be provided either on standard input or in a file
the data source, which can either be the URL of the data source or the path to your Prisma schema file
The output of the command is connector-specific, and is not meant for returning data, but only to report success or failure.

## Prerequisites

Before using the \`db execute\` command, if you do not use the \`--url\` option you must define a valid datasource within your \`schema.prisma\` file.

For example, the following datasource defines a SQLite database file within the current directory:

\`\`\`
datasource db {
  provider = "sqlite"
  url      = "file:my-database.db"
}
\`\`\`

## Options

One of the following data source inputs is required:

| Option       | Description                                                            |
|--------------|------------------------------------------------------------------------|
| \`--url\`    | URL of the data source to run the command on                           |
| \`--schema\` | Path to a Prisma schema file, uses the URL in the \`datasource\` block |

One of the following script inputs is required:

| Option      | Description                                                           |
|-------------|-----------------------------------------------------------------------|
| \`--stdin\` | Use the terminal standard input as the script to be executed          |
| \`--file\`  | Path to a file. The content will be sent as the script to be executed |

Other options:

| Option     | Required | Description                |
|------------|----------|----------------------------|
| \`--help\` | No       | Displays the help message. |

`,
  migrateDev: `
# migrate dev

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-dev

For use in development environments only, requires shadow database

The migrate dev command:
1. Reruns the existing migration history in the shadow database in order to detect schema drift (edited or deleted migration file, or a manual changes to the database schema)
2. Applies pending migrations to the shadow database (for example, new migrations created by colleagues)
3. Generates a new migration from any changes you made to the Prisma schema before running migrate dev
4. Applies all unapplied migrations to the development database and updates the _prisma_migrations table
5. Triggers the generation of artifacts (for example, Prisma Client)

> This command is not supported on MongoDB. Use \`db push\` instead.

## Options

| Option                | Required | Description                                                                                                                       | Default |
|-----------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------|---------|
| \`--create-only\`     | No       | Creates a new migration based on the changes in the schema but does not apply that migration. Run migrate dev to apply migration. |         |
| \`--skip-seed\`       | No       | Skip triggering seed                                                                                                              |         |
| \`----skip-generate\` | No       | Skip triggering generators (for example, Prisma Client)                                                                           |         |
| \`--help\` / \`--h\`  | No       | Displays the help message                                                                                                         |         |

## Arguments

| Argument     | Required | Description                                                                                                                                           | Default                                         |
|--------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| \`--name\`   | No       | The name of the migration. If no name is provided, the CLI will prompt you.                                                                           |                                                 |
| \`--schema\` | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported. | \`./schema.prisma\`, \`./prisma/schema.prisma\` |

`,
  migrateReset: `
# migrate reset

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-reset

For use in development environments only

This command:

1. Drops the database/schema if possible, or performs a soft reset if the environment does not allow deleting databases/schemas
2. Creates a new database/schema with the same name if the database/schema was dropped
3. Applies all migrations
4. Runs seed scripts

> This command is not supported on MongoDB. Use \`db push\` instead

## Options

| Option                | Required | Description                                             | Default |
|-----------------------|----------|---------------------------------------------------------|---------|
| \`--force\`           | No       | Skip the confirmation prompt                            |         |
| \`----skip-generate\` | No       | Skip triggering generators (for example, Prisma Client) |         |
| \`--skip-seed\`       | No       | Skip triggering seed                                    |         |
| \`--help\` / \`--h\`  | No       | Displays the help message                               |         |

## Arguments

| Argument     | Required | Description                                                                                                                                           | Default                                         |
|--------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| \`--schema\` | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported. | \`./schema.prisma\`, \`./prisma/schema.prisma\` |

`,
  migrateResolve: `
# migrate resolve

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-resolve

The \`migrate resolve\` command allows you to solve migration history issues in production by marking a failed migration as already applied (supports baselining) or rolled back.

Note that this command can only be used with a failed migration. If you try to use it with a successful migration you will receive an error.

> This command is not supported on MongoDB. Use \`db push\` instead.

## Options

| Option                | Required | Description                                             | Default |
|-----------------------|----------|---------------------------------------------------------|---------|
| \`--help\` / \`--h\`  | No       | Displays the help message                               |         |

## Arguments

| Argument          | Required | Description                                                                                                                                           | Default                                         |
|-------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| \`--applied\`     | No*      | Record a specific migration as applied - for example \`--applied "20201231000000_add_users_table"\`                                                   |                                                 |
| \`--rolled-back\` | No*      | Record a specific migration as rolled back - for example \`--rolled-back "20201231000000_add_users_table"\`                                           | \`./schema.prisma\`, \`./prisma/schema.prisma\` |
| \`--schema\`      | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported. | \`./schema.prisma\`, \`./prisma/schema.prisma\` |

You must specify either \`--rolled-back\` or \`--applied\`.
`,
  migrateStatus: `
# migrate status

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-status

The \`prisma migrate status\` command looks up the migrations in \`./prisma/migrations/*\` folder and the entries in the \`_prisma_migrations\` table and compiles information about the state of the migrations in your database.

> This command is not supported on MongoDB. Use \`db push\` instead.

## Options

| Option                | Required | Description                                             | Default |
|-----------------------|----------|---------------------------------------------------------|---------|
| \`--help\` / \`--h\`  | No       | Displays the help message                               |         |

## Arguments

| Argument          | Required | Description                                                                                                                                           | Default                                         |
|-------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| \`--schema\`      | No       | Specifies the path to the desired \`schema.prisma\` file to be processed instead of the default path. Both absolute and relative paths are supported. | \`./schema.prisma\`, \`./prisma/schema.prisma\` |

`,
  migrateDiff: `
# migrate diff

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-diff

> The \`migrate diff\` command is Generally Available in versions 3.13.0 and later. If you're using a version between 3.9.0 and 3.13.0, it is available behind a \`--preview-feature\` CLI flag.

> This command is only partially supported for MongoDB. See the command options below for details.

This command compares two database schema sources and outputs a description of a migration taking the first to the state of the second.

The output can be given either as a human-readable summary (the default) or an executable script.

> The \`migrate diff\` command can only compare database features that are supported by Prisma. If two databases differ only in unsupported features, such as views or triggers, then \`migrate diff\` will not show any difference between them.

The format of the command is:

\`\`\`
prisma migrate diff --from-... <source1> --to-... <source2>
\`\`\`

where the --from-... and --to-... options are selected based on the type of database schema source. The supported types of sources are:

- live databases
- migration histories
- Prisma data models
- an empty schema

Both schema sources must use the same database provider. For example, a diff comparing a PostgreSQL data source with a SQLite data source is not supported.

## Prerequisites

Before using the \`migrate diff\` command, if you are using the --from-schema-datasource or --to-schema-datasource you must define a valid datasource within your schema.prisma file.

For example, the following datasource defines a SQLite database file within the current directory:

\`\`\`
datasource db {
  provider = "sqlite"
  url      = "file:my-database.db"
}
\`\`\`

## Options

One of the following --from-... options is required:

| Option                       | Description                                                                         | Notes                    |
|------------------------------|-------------------------------------------------------------------------------------|--------------------------|
| \`--from-url\`               | A data source URL                                                                   |                          |
| \`--from-migrations\`        | Path to the Prisma Migrate migrations directory                                     | Not supported in MongoDB |
| \`--from-schema-datamodel\`  | Path to a Prisma schema file, uses the data model for the diff                      | Not supported in MongoDB |
| \`--from-schema-datasource\` | Path to a Prisma schema file, uses the URL in the \`datasource\` block for the diff | Not supported in MongoDB |
| \`--from-empty\`             | Assume that you the data model you are migrating from is empty                      | Not supported in MongoDB |

One of the following \`--to-...\` options is required:

| Option                     | Description                                                                         | Notes                    |
|----------------------------|-------------------------------------------------------------------------------------|--------------------------|
| \`--to-url\`               | A data source URL                                                                   |                          |
| \`--to-migrations\`        | Path to the Prisma Migrate migrations directory                                     | Not supported in MongoDB |
| \`--to-schema-datamodel\`  | Path to a Prisma schema file, uses the data model for the diff                      | Not supported in MongoDB |
| \`--to-schema-datasource\` | Path to a Prisma schema file, uses the URL in the \`datasource\` block for the diff | Not supported in MongoDB |
| \`--to-empty\`             | Assume that you the data model you are migrating to is empty                        | Not supported in MongoDB |

`,
  studio: `
# migrate studio

Reference: https://www.prisma.io/docs/reference/api-reference/command-reference#studio

The studio command allows you to interact with and manage your data interactively. It does this by starting a local web server with a web app configured with your project's data schema and records.

## Prerequisites

Before using the \`studio\` command, you must define a valid datasource within your \`schema.prisma\` file.

For example, the following \`datasource\` defines a SQLite database file within the current directory:

\`\`\`
datasource db {
  provider = "sqlite"
  url      = "file:my-database.db"
}
\`\`\`

## Options

The \`studio\` command recognizes the following options:

| Option                | Reqeuired | Description | Default                             |                            |
|-----------------------|-----------|-------------|-------------------------------------|----------------------------|
| \`-b\`, \`--browser\` | No        |             | The browser to auto-open Studio in. | \`<your-default-browser>\` |
| \`-h\`, \`--help\`    | No        |             | Show all available options and exit |                            |
| \`-p\`, \`--port\`    | No        |             | The port number to start Studio on. | 5555                       |


## Arguments

| Argument     | Required | Description                                                                                                                                       | Default                                        |
|--------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| \`--schema\` | No       | Specifies the path to the desired schema.prisma file to be processed instead of the default path. Both absolute and relative paths are supported. | \`./schema.prisma\`,\`./prisma/schema.prisma\` |

`,
};
