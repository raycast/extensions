// Typecheck needs raycast-env.d.ts (the Preferences types), which is gitignored and only written by
// a Raycast build. When it is missing (a fresh clone) or older than package.json (a preference changed
// since), write it with a throwaway dist build. An up-to-date file is left alone.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FILE = "raycast-env.d.ts";
const stale = () => !existsSync(FILE) || statSync(FILE).mtimeMs < statSync("package.json").mtimeMs;

if (stale()) {
  const out = mkdtempSync(join(tmpdir(), "fabric-raycast-env-"));
  let log = "";
  try {
    // dist + -o keeps the build out of Raycast's own extensions folder.
    execFileSync("ray", ["build", "-e", "dist", "-o", out, "-I"], { stdio: "pipe" });
  } catch (e) {
    // The types are written before ray's own type check, so a failed build can still leave the file;
    // tsc then reports the real errors.
    // A missing `ray` (ENOENT) has no output, only a message.
    const { message, stdout, stderr } = e as Error & { stdout?: Buffer; stderr?: Buffer };
    log = [message, String(stdout ?? ""), String(stderr ?? "")].join("\n");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  if (stale()) {
    console.error(`${FILE} is missing or stale and ray build did not write it.\n${log}`);
    process.exit(1);
  }
  console.error(`wrote ${FILE} with a throwaway ray build`);
}
