import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { environment } from "@raycast/api";

/** A temporary `environment.supportPath`. `using` deletes it and restores the previous path. */
export function createSupportDirectory() {
  const previousPath = environment.supportPath;
  const path = mkdtempSync(join(tmpdir(), "pods-control-support-test-"));
  environment.supportPath = path;
  return {
    path,
    [Symbol.dispose]: () => {
      try {
        rmSync(path, { recursive: true, force: true });
      } finally {
        environment.supportPath = previousPath;
      }
    },
  };
}
