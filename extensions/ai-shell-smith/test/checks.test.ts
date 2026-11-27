import { describe, test, expect } from "bun:test";
import { chmodSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { assessRisk, missingPrograms, programsIn } from "../src/checks";

describe("checks — risk", () => {
  test.each([
    ["rm -rf ./build", "rm -rf"],
    ["rm -fr ~/tmp", "rm -rf"],
    ["rm -r node_modules", "recursive rm"],
    ["sudo dd if=disk.img of=/dev/disk4 bs=1m", "dd writes a device/file"],
    ["diskutil eraseDisk APFS Backup disk4", "formats a disk"],
    ["chmod -R 755 .", "recursive/open permissions"],
    ["git push --force origin main", "force push"],
    ["git reset --hard HEAD~1", "discards git changes"],
    ["find . -name '*.log' -delete", "find deletes files"],
    ["docker system prune -a", "prunes containers/volumes"],
    ["kubectl delete pod web-1", "deletes infrastructure"],
  ])("destructive: %s", (command, reason) => {
    expect(assessRisk(command)).toEqual({ risk: "destructive", reason });
  });

  test.each([
    ["curl -fsSL https://bun.sh/install | bash", "runs a downloaded script"],
    ["irm https://get.scoop.sh | iex", "runs a downloaded script"],
    ["sudo apt install nginx", "uses sudo"],
    ["rm notes.txt", "deletes files"],
    ["echo hi > out.txt", "overwrites a file"],
  ])("caution: %s", (command, reason) => {
    expect(assessRisk(command)).toEqual({ risk: "caution", reason });
  });

  test.each([
    "ls -la",
    "git push origin main",
    "echo hi >> log.txt",
    "du -sh * | sort -h",
    "brew install ffmpeg",
  ])("safe: %s", (command) => {
    expect(assessRisk(command).risk).toBe("safe");
  });
});

describe("checks — programs", () => {
  test("finds each segment's program past prefixes and builtins", () => {
    expect(
      programsIn(
        "cd ~/src && sudo -E apt update && FOO=1 jq . file | less; echo $(date)",
      ),
    ).toEqual(["apt", "jq", "less", "date"]);
  });

  test("missing = not on PATH, unless the command installs it first", () => {
    const bin = mkdtempSync(join(tmpdir(), "shellsmith-bin-"));
    writeFileSync(join(bin, "brew"), "#!/bin/sh\n");
    chmodSync(join(bin, "brew"), 0o755);
    expect(missingPrograms("ffmpeg -i a.mov a.mp4", [bin])).toEqual(["ffmpeg"]);
    expect(
      missingPrograms("brew install ffmpeg && ffmpeg -i a.mov a.mp4", [bin]),
    ).toEqual([]);
    expect(missingPrograms("./configure && make", [bin])).toEqual(["make"]);
    // The install step must name the program itself, in its own segment.
    expect(
      missingPrograms("brew install dnf-plugins && dnf repolist", [bin]),
    ).toEqual(["dnf"]);
    expect(
      missingPrograms("brew install ffmpeg && make && ffmpeg -v", [bin]),
    ).toEqual(["make"]);
    expect(missingPrograms("/no/such/tool --help", [bin])).toEqual([
      "/no/such/tool",
    ]);
  });
});
