import { defineConfig } from "drizzle-kit";
import { environment } from "@raycast/api";

export default defineConfig({
  out: "./assets/drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    // When generating new migrations, since drizzle doesn't actually need to connect to the
    // database, comment out this line, otherwise `npx` will complain that `@raycast/api` can't be
    // found.
    url: `./${environment.supportPath}/raycast-focus-stats.db`,
  },
});
