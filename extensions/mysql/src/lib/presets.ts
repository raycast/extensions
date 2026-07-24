export interface Preset {
  key: string;
  title: string;
  category: string;
  sql: string;
  description: string;
}

/** Common MySQL commands. Commands that need a table/database are done via Run Query / Browse Schema. */
export const PRESETS: Preset[] = [
  {
    key: "databases",
    title: "Show Databases",
    category: "Server",
    sql: "SHOW DATABASES",
    description: "List all databases",
  },
  {
    key: "version",
    title: "Server Version",
    category: "Server",
    sql: "SELECT VERSION() AS version",
    description: "MySQL server version",
  },
  {
    key: "processlist",
    title: "Process List",
    category: "Server",
    sql: "SHOW FULL PROCESSLIST",
    description: "Currently running threads",
  },
  { key: "status", title: "Status", category: "Server", sql: "SHOW STATUS", description: "Server status variables" },
  {
    key: "variables",
    title: "Variables",
    category: "Server",
    sql: "SHOW VARIABLES",
    description: "Server system variables",
  },
  {
    key: "engines",
    title: "Engines",
    category: "Server",
    sql: "SHOW ENGINES",
    description: "Available storage engines",
  },
  {
    key: "tables",
    title: "Show Tables",
    category: "Schema",
    sql: "SHOW TABLES",
    description: "Tables in the current database",
  },
  {
    key: "current-db",
    title: "Current Database",
    category: "Schema",
    sql: "SELECT DATABASE() AS `database`",
    description: "The database selected on this connection",
  },
  {
    key: "user",
    title: "Current User",
    category: "Session",
    sql: "SELECT CURRENT_USER() AS user",
    description: "The authenticated user",
  },
];
