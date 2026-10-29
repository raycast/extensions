import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./assets/drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "sqlite",
});
