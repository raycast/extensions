import { existsSync } from "node:fs";
if (existsSync("assets/catalog-development.json") || process.env.HOTKYS_CATALOG_ORIGIN) throw new Error("Release builds must use the public catalog. Stop the catalog development session and remove its local override.");
