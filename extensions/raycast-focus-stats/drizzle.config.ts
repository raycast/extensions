import { defineConfig } from "drizzle-kit";
import { environment } from "@raycast/api";

export default defineConfig({
  out: "./assets/drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `${environment.supportPath}/raycast-focus-stats.db`,
  },
});
