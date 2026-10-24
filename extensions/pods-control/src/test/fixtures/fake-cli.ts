import { chmod, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/** A shell script standing in for the CLI. `await using` deletes it. */
export async function createFakeCli(body: string) {
  const directory = await mkdtemp(join(tmpdir(), "pods-control-cli-test-"));
  const path = join(directory, "pods-control");
  await writeFile(path, `#!/bin/sh\nset -eu\n${body}\n`, "utf8");
  await chmod(path, 0o755);
  return {
    path,
    [Symbol.asyncDispose]: () => rm(directory, { recursive: true, force: true }),
  };
}
