import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

// Data files live in assets/data and are read at runtime (rather than imported) so the
// large word list is only parsed when it is first needed.
export const readDataFile = <T>(name: string): T =>
  JSON.parse(readFileSync(join(environment.assetsPath, "data", name), "utf8")) as T;
