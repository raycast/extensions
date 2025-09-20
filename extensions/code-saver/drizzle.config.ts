import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/*",
  out: "./assets/drizzle",
  driver: "better-sqlite",
  dbCredentials: {
    url: "./code-saver.db", // this db is just for db migratio generation usage
  }
} satisfies Config;