import { extractCSSVars } from "../css";
import { fetchUnpkgFile } from "../unpkg";
import { VarsSection, VersionConfig } from "./types";

export function fetchVars(config: VersionConfig, packageVersion: string): Promise<VarsSection[]> {
  const version = packageVersion || config.version;

  return Promise.all(
    config.sections.map(async (section) => ({
      ...section,
      vars: extractCSSVars(await fetchUnpkgFile(section.file, version)),
    })),
  );
}
