import { environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
export function resolveCatalogOrigin(isDevelopment: boolean, override?: string): string {
  if (!override) return "https://hotkys.com";
  if (!isDevelopment) throw new Error("Catalog overrides are only available during extension development");
  const url = new URL(override);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Catalog URL must be an HTTP(S) origin");
  return url.origin;
}
function developmentOrigin(): string | undefined {
  if (!environment.isDevelopment) return undefined;
  try {
    return (
      JSON.parse(readFileSync(join(environment.assetsPath, "catalog-development.json"), "utf8")) as { origin: string }
    ).origin;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
export const catalogOrigin = resolveCatalogOrigin(environment.isDevelopment, developmentOrigin());
export function catalogUrl(path: string): string {
  return `${catalogOrigin}/${path.replace(/^\//, "")}`;
}
