import { Config } from "drizzle-kit";


const config: Config = {
  driver: 'better-sqlite',
  out: './migrations',
  schema: './src/db/schema.ts',
}

export default config;