import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { homedir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { checkRemovable, isRemovable, needsAdminToRemove, shellQuote } from "../src/lib/safety";

const HOME = homedir();

describe("checkRemovable accepts", () => {
  const allowed = [
    "/Applications/Example.app",
    "/Applications/Utilities/Example.app",
    join(HOME, "Library/Caches/com.example.app"),
    join(HOME, "Library/Application Support/Example"),
    // Two levels down, because a vendor folder may hold one app's data.
    join(HOME, "Library/Application Support/Google/Chrome"),
    join(HOME, "Library/Containers/com.example.app"),
    join(HOME, "Library/Group Containers/AB12CD34EF.com.example.app"),
    join(HOME, "Library/Preferences/com.example.app.plist"),
    join(HOME, "Library/Preferences/ByHost/com.example.app.1234.plist"),
    "/Library/LaunchDaemons/com.example.helper.plist",
  ];

  for (const path of allowed) {
    it(path.replace(HOME, "~"), () => assert.equal(isRemovable(path), true));
  }
});

describe("checkRemovable rejects", () => {
  const rejected: [string, string][] = [
    ["a search root itself", join(HOME, "Library/Caches")],
    ["the Applications folder", "/Applications"],
    ["the home Library", join(HOME, "Library")],
    ["the filesystem root", "/"],
    ["a relative path", "Library/Caches/com.example.app"],
    ["a traversal", join(HOME, "Library/Caches/../../../etc/passwd")],
    ["a path outside every root", join(HOME, "Documents/Example")],
    ["a system directory", "/System/Library/CoreServices"],
    ["a shared vendor folder", join(HOME, "Library/Application Support/Google")],
    ["an Apple container", join(HOME, "Library/Containers/com.apple.Safari")],
    ["Apple data nested in a root", join(HOME, "Library/Application Support/Apple")],
    ["Raycast itself", "/Applications/Raycast.app"],
    ["an Applications sub-folder", "/Applications/Utilities"],
    ["a path deeper than its root allows", join(HOME, "Library/Caches/com.example.app/Sub")],
    ["a trailing separator", join(HOME, "Library/Caches/com.example.app/")],
    // Receipts are cleared with `pkgutil --forget`, never by moving the files:
    // pkgutil keeps a database alongside them that a plain move would desync.
    ["an installer receipt", "/private/var/db/receipts/com.example.app.bom"],
    ["the receipts directory", "/private/var/db/receipts"],
  ];

  for (const [name, path] of rejected) {
    it(name, () => assert.equal(isRemovable(path), false));
  }
});

describe("symlink escape", () => {
  const link = join(HOME, `Library/Caches/app-uninstaller-test-${process.pid}`);
  const nested = join(link, "com.example.app");
  const target = mkdtempSync(join(tmpdir(), "app-uninstaller-"));

  after(() => {
    try {
      unlinkSync(link);
    } catch {
      /* already gone */
    }
    rmSync(target, { recursive: true, force: true });
  });

  it("refuses a path that leaves its root through a symlinked parent", () => {
    symlinkSync(target, link);
    // The literal path looks like it is inside ~/Library/Caches, but its parent
    // redirects it outside; resolving the parent is what catches this.
    assert.equal(isRemovable(nested), false);
  });

  it("still allows removing the symlink itself", () => {
    assert.equal(isRemovable(link), true);
  });
});

describe("checkRemovable result", () => {
  it("reports whether sudo would be needed", () => {
    assert.equal(checkRemovable(join(HOME, "Library/Caches/com.example.app")).needsAdmin, false);
    // /Library/LaunchDaemons is root:wheel and not group-writable.
    assert.equal(checkRemovable("/Library/LaunchDaemons/com.example.plist").needsAdmin, true);
  });

  it("explains why it refused", () => {
    assert.throws(() => checkRemovable(join(HOME, "Documents/Example")), /outside every known/);
  });
});

describe("shellQuote", () => {
  it("survives quotes and spaces", () => {
    assert.equal(shellQuote("/tmp/it's here"), `'/tmp/it'\\''s here'`);
    assert.equal(shellQuote("/tmp/a b; rm -rf /"), `'/tmp/a b; rm -rf /'`);
  });
});

describe("needsAdminToRemove", () => {
  const scratch = mkdtempSync(join(tmpdir(), "app-uninstaller-perm-"));

  const created: string[] = [];

  after(() => {
    // Restore write permission first: the read-only directory this suite
    // creates cannot otherwise be deleted.
    for (const target of created) {
      try {
        chmodSync(target, 0o755);
      } catch {
        /* already gone */
      }
    }
    rmSync(scratch, { recursive: true, force: true });
  });

  function make(name: string, mode: number, asDirectory: boolean): string {
    const target = join(scratch, name);
    if (asDirectory) {
      mkdirSync(target);
      writeFileSync(join(target, "inner"), "x");
    } else {
      writeFileSync(target, "x");
    }
    chmodSync(target, mode);
    created.push(target);
    return target;
  }

  it("clears a writable directory", () => {
    assert.equal(needsAdminToRemove(make("writable-dir", 0o755, true)), false);
  });

  it("requires admin for a read-only directory", () => {
    // Moving a directory to another parent rewrites its "..", which needs write
    // permission on the directory itself — this is the App Store app case.
    assert.equal(needsAdminToRemove(make("readonly-dir", 0o555, true)), true);
  });

  it("does not require admin for a read-only file", () => {
    // Files carry no ".." entry, so their own mode is irrelevant to the move.
    assert.equal(needsAdminToRemove(make("readonly-file", 0o444, false)), false);
  });

  it("requires admin when the parent is not writable", () => {
    assert.equal(needsAdminToRemove("/Library/LaunchDaemons/com.example.plist"), true);
  });

  it("reports the real App Store case correctly", () => {
    // /Applications is group-writable, so a parent-only check would wrongly
    // clear a root-owned bundle.
    const bundles = ["/Applications/Bitwarden.app", "/Applications/Keynote.app"];
    for (const bundle of bundles) {
      if (!existsSync(bundle)) continue;
      assert.equal(needsAdminToRemove(bundle), true, `${bundle} should need admin`);
    }
  });
});
