import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./assets/drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./raycast-focus-stats.db",
  },
});
