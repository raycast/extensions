import { chmodSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/** Write an executable shell script standing in for obsidian-cli; returns its path. */
export function fakeCli(script: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "qa-cli-")), "obsidian-cli");
  writeFileSync(path, `#!/bin/sh\n${script}\n`);
  chmodSync(path, 0o755);
  return path;
}

/** Shell-quote a string for use inside a fake CLI script. */
export const sq = (text: string) => `'${text.replace(/'/g, `'\\''`)}'`;
