import { Color, Icon } from "@raycast/api";
import { Category, Section, PrismaCommand } from "../types";
import { details } from "./details";

export const prismaSections: Section[] = [
  {
    title: "Common",
    category: Category.COMMON,
    tintColor: Color.Purple,
    icon: Icon.Terminal,
  },
  {
    title: "DB",
    category: Category.DB,
    tintColor: Color.Green,
    icon: Icon.HardDrive,
  },
  {
    title: "Migrate",
    category: Category.MIGRATE,
    tintColor: Color.Magenta,
    icon: Icon.Cloud,
  },
  {
    title: "Studio",
    category: Category.STUDIO,
    tintColor: Color.Blue,
    icon: Icon.AppWindowSidebarLeft,
  },
];

export const prismaCommands: PrismaCommand[] = [
  {
    title: "prisma version",
    subtitle:
      "The version command outputs information about your current prisma version, platform, and engine binaries.",
    category: Category.COMMON,
    copyToClipboard: "prisma version",
    detailsMarkdown: details.version,
  },
  {
    title: "prisma version --json",
    subtitle: "Outputs version information in JSON format.",
    category: Category.COMMON,
    copyToClipboard: "prisma version --json",
    detailsMarkdown: details.version,
  },
  {
    title: "prisma init",
    subtitle: "Bootstraps a fresh Prisma project within the current directory.",
    category: Category.COMMON,
    copyToClipboard: "prisma init",
    detailsMarkdown: details.init,
  },
  {
    title: "prisma init --datasource-provider [PROVIDER]",
    subtitle: "Bootstraps a fresh Prisma project with the datasource provider to use.",
    category: Category.COMMON,
    copyToClipboard: "prisma init --datasource-provider [provider]",
    detailsMarkdown: details.init,
  },
  {
    title: "prisma init --url [URL]",
    subtitle: "Bootstraps a fresh Prisma project with custom datasource url.",
    category: Category.COMMON,
    copyToClipboard: "prisma init --url [url]",
    detailsMarkdown: details.init,
  },
  {
    title: "prisma generate",
    subtitle:
      "The generate command generates assets like Prisma Client based on the generator and data model blocks defined in your prisma/schema.prisma file.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma generate --data-proxy",
    subtitle: "The generate command will generate Prisma Client for use with the Data Proxy.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate --data-proxy",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma generate --accelerate",
    subtitle: "The generate command will generate Prisma Client for use with Accelerate.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate --accelerate",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma generate --no-engine",
    subtitle:
      "The generate command will generate Prisma Client without an accompanied engine for use with Data Proxy or Accelerate.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate --no-engine",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma generate --watch",
    subtitle:
      "The generate command will continue to watch the schema.prisma file and re-generate Prisma Client on file changes.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate --watch",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma generate --schema=./schema.prisma",
    subtitle:
      "The generate command generates assets like Prisma Client based on the generator and data model blocks defined in your prisma/schema.prisma file.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate --schema=./schema.prisma",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma generate --generator <GENERATOR>",
    subtitle: "Specifies the path to the desired schema.prisma file to be processed instead of the default path.",
    category: Category.COMMON,
    copyToClipboard: "prisma generate --generator <GENERATOR>",
    detailsMarkdown: details.generate,
  },
  {
    title: "prisma introspect",
    subtitle: "",
    category: Category.COMMON,
    copyToClipboard: "prisma introspect",
    detailsMarkdown: details.introspect,
  },
  {
    title: "prisma introspect --schema=./schema.prisma",
    subtitle: "",
    category: Category.COMMON,
    copyToClipboard: "prisma introspect --schema=./schema.prisma",
    detailsMarkdown: details.introspect,
  },
  {
    title: "prisma validate",
    subtitle: "Validates the Prisma Schema Language of the Prisma schema file.",
    category: Category.COMMON,
    copyToClipboard: "prisma validate",
    detailsMarkdown: details.validate,
  },
  {
    title: "prisma validate --schema=./schema.prisma",
    subtitle: "Validates the Prisma Schema Language of the Prisma schema file.",
    category: Category.COMMON,
    copyToClipboard: "prisma validate --schema=./schema.prisma",
    detailsMarkdown: details.validate,
  },
  {
    title: "prisma format",
    subtitle: "Formats the Prisma schema file, which includes validating, formatting, and persisting the schema.",
    category: Category.COMMON,
    copyToClipboard: "prisma format",
    detailsMarkdown: details.format,
  },
  {
    title: "prisma format --schema=./schema.prisma",
    subtitle: "Formats the Prisma schema file, which includes validating, formatting, and persisting the schema.",
    category: Category.COMMON,
    copyToClipboard: "prisma format --schema=./schema.prisma",
    detailsMarkdown: details.format,
  },
  {
    title: "prisma db pull",
    subtitle:
      "The db pull command connects to your database and adds Prisma models to your Prisma schema that reflect the current database schema.",
    category: Category.DB,
    copyToClipboard: "prisma db pull",
    detailsMarkdown: details.dbPull,
  },
  {
    title: "prisma db pull --force",
    subtitle: "Adds Prisma models to your Prisma schema and force overwrite of manual changes made to schema.",
    category: Category.DB,
    copyToClipboard: "prisma db pull --force",
    detailsMarkdown: details.dbPull,
  },
  {
    title: "prisma db pull --print",
    subtitle:
      "Connects to your database and prints the created schema.prisma to the screen instead of writing it to the filesystem.",
    category: Category.DB,
    copyToClipboard: "prisma db pull --print",
    detailsMarkdown: details.dbPull,
  },
  {
    title: "prisma db pull --schema=./schema.prisma",
    subtitle:
      "The db pull command connects to your database and adds Prisma models to your Prisma schema that reflect the current database schema.",
    category: Category.DB,
    copyToClipboard: "prisma db pull --schema=./schema.prisma",
    detailsMarkdown: details.dbPull,
  },
  {
    title: "prisma db push",
    subtitle:
      "The db push command pushes the state of your Prisma schema file to the database without using migrations. It creates the database if the database does not exist.",
    category: Category.DB,
    copyToClipboard: "prisma db push",
    detailsMarkdown: details.dbPush,
  },
  {
    title: "prisma db push --skip-generate",
    subtitle: "Skip generation of artifacts such as Prisma Client",
    category: Category.DB,
    copyToClipboard: "prisma db push --skip-generate",
    detailsMarkdown: details.dbPush,
  },
  {
    title: "prisma db push --force-reset",
    subtitle:
      "Resets the database and then updates the schema - useful if you need to start from scratch due to unexecutable migrations.",
    category: Category.DB,
    copyToClipboard: "prisma db push --force-reset",
    detailsMarkdown: details.dbPush,
  },
  {
    title: "prisma db push --accept-data-loss",
    subtitle:
      "Ignore data loss warnings. This option is required if as a result of making the schema changes, data may be lost.",
    category: Category.DB,
    copyToClipboard: "prisma db push --accept-data-loss",
    detailsMarkdown: details.dbPush,
  },
  {
    title: "prisma db push --schema=./schema.prisma",
    subtitle:
      "The db push command pushes the state of your Prisma schema file to the database without using migrations. It creates the database if the database does not exist.",
    category: Category.DB,
    copyToClipboard: "prisma db push --schema=./schema.prisma",
    detailsMarkdown: details.dbPush,
  },
  {
    title: "prisma db seed",
    subtitle: "Seed your database using Prisma Client and Prisma's integrated seeding functionality",
    category: Category.DB,
    copyToClipboard: "prisma db seed",
    detailsMarkdown: details.dbSeed,
  },
  {
    title: "prisma db seed -- --arg1 value1 --arg2 value2",
    subtitle: "Seed your database using Prisma Client and Prisma's integrated seeding functionality",
    category: Category.DB,
    copyToClipboard: "prisma db seed -- --arg1 value1 --arg2 value2",
    detailsMarkdown: details.dbSeed,
  },
  {
    title: "prisma db execute",
    subtitle: "This command applies a SQL script to the database without interacting with the Prisma migrations table",
    category: Category.DB,
    copyToClipboard: "prisma db execute",
    detailsMarkdown: details.dbExecute,
  },
  {
    title: "prisma migrate dev",
    subtitle:
      "The migrate dev command reruns the existing migration history, applies pending migrations, generates a new migration from any changes and so on",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate dev",
    detailsMarkdown: details.migrateDev,
  },
  {
    title: "prisma migrate dev --create-only",
    subtitle: "Creates a new migration based on the changes in the schema but does not apply that migration.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate dev --create-only",
    detailsMarkdown: details.migrateDev,
  },
  {
    title: "prisma migrate dev --skip-seed",
    subtitle: "The migrate dev command but skip triggering seed",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate dev --skip-seed",
    detailsMarkdown: details.migrateDev,
  },
  {
    title: "prisma migrate dev --skip-generate",
    subtitle: "The migrate dev command but skip triggering generators (for example, Prisma Client)",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate dev --skip-generate",
    detailsMarkdown: details.migrateDev,
  },
  {
    title: "prisma migrate dev --name <name>",
    subtitle: "The name of the migration. If no name is provided, the CLI will prompt you.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate dev --name <name>",
    detailsMarkdown: details.migrateDev,
  },
  {
    title: "prisma migrate dev --schema=./schema.prisma",
    subtitle:
      "The migrate dev command reruns the existing migration history, applies pending migrations, generates a new migration from any changes and so on",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate dev --schema=./schema.prisma",
    detailsMarkdown: details.migrateDev,
  },
  {
    title: "prisma migrate reset",
    subtitle:
      "Drops the database/schema if possible, or performs a soft reset if the environment does not allow deleting databases/schemas",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate reset",
    detailsMarkdown: details.migrateReset,
  },
  {
    title: "prisma migrate reset --force",
    subtitle: "Skip the confirmation prompt when running migrate reset",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate reset --force",
    detailsMarkdown: details.migrateReset,
  },
  {
    title: "prisma migrate reset --skip-generate",
    subtitle: "Drops the database/schema and skip triggering generators (for example, Prisma Client)",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate reset --skip-generate",
    detailsMarkdown: details.migrateReset,
  },
  {
    title: "prisma migrate reset --skip-seed",
    subtitle: "Drops the database/schema and skip triggering seed",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate reset --skip-seed",
    detailsMarkdown: details.migrateReset,
  },
  {
    title: "prisma migrate reset --schema=./schema.prisma",
    subtitle:
      "Drops the database/schema if possible, or performs a soft reset if the environment does not allow deleting databases/schemas",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate reset --schema=./schema.prisma",
    detailsMarkdown: details.migrateReset,
  },
  {
    title: "prisma migrate resolve",
    subtitle:
      "The migrate resolve command allows you to solve migration history issues in production by marking a failed migration as already applied (supports baselining) or rolled back.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate resolve",
    detailsMarkdown: details.migrateResolve,
  },
  {
    title: "prisma migrate resolve --applied <migration>",
    subtitle: "Record a specific migration as applied.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate resolve --applied <migration>",
    detailsMarkdown: details.migrateResolve,
  },
  {
    title: "prisma migrate resolve --rolled-back <migration>",
    subtitle: "Record a specific migration as rolled back.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate resolve --rolled-back <migration>",
    detailsMarkdown: details.migrateResolve,
  },
  {
    title: "prisma migrate resolve --schema=./schema.prisma",
    subtitle:
      "The migrate resolve command allows you to solve migration history issues in production by marking a failed migration as already applied (supports baselining) or rolled back.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate resolve --schema=./schema.prisma",
    detailsMarkdown: details.migrateResolve,
  },
  {
    title: "prisma migrate status",
    subtitle:
      "The prisma migrate status command looks up the migrations in ./prisma/migrations/* folder and the entries in the _prisma_migrations table and compiles information about the state of the migrations in your database.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate status",
    detailsMarkdown: details.migrateStatus,
  },
  {
    title: "prisma migrate status --schema=./schema.prisma",
    subtitle:
      "The prisma migrate status command looks up the migrations in ./prisma/migrations/* folder and the entries in the _prisma_migrations table and compiles information about the state of the migrations in your database.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate status --schema=./schema.prisma",
    detailsMarkdown: details.migrateStatus,
  },
  {
    title: "prisma migrate diff --from-<FROM> --to-<TO>",
    subtitle:
      "This command compares two database schema sources and outputs a description of a migration taking the first to the state of the second.",
    category: Category.MIGRATE,
    copyToClipboard: "prisma migrate diff --from-<FROM> --to-<TO>",
    detailsMarkdown: details.migrateDiff,
  },
  {
    title: "prisma studio",
    subtitle: "The studio command allows you to interact with and manage your data interactively.",
    category: Category.STUDIO,
    copyToClipboard: "prisma studio",
    detailsMarkdown: details.studio,
  },
  {
    title: "prisma studio --browser <BROWSER>",
    subtitle: "The browser to auto-open Studio in.",
    category: Category.STUDIO,
    copyToClipboard: "prisma studio --browser <BROWSER>",
    detailsMarkdown: details.studio,
  },
  {
    title: "prisma studio --port <PORT>",
    subtitle: "The port number to start Studio on. Default is 5555",
    category: Category.STUDIO,
    copyToClipboard: "prisma studio --port <PORT>",
    detailsMarkdown: details.studio,
  },
  {
    title: "prisma studio --schema=./schema.prisma",
    subtitle: "The studio command allows you to interact with and manage your data interactively.",
    category: Category.STUDIO,
    copyToClipboard: "prisma studio --schema=./schema.prisma",
    detailsMarkdown: details.studio,
  },
];
