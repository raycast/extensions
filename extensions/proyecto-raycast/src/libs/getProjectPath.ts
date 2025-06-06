import { join } from "node:path";
import { ROOT_DIR } from "./constants";

export function getProjectPath(name: string) {
  return join(ROOT_DIR, name);
}
