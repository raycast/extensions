import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expandPath, folderName, folderStatus } from "../src/paths";

const home = "/Users/ada";

describe("expandPath", () => {
  test("expands the home folder", () => {
    expect(expandPath("~", home)).toBe(home);
    expect(expandPath("~/Projects", home)).toBe("/Users/ada/Projects");
  });

  test("keeps absolute paths and drops a trailing slash", () => {
    expect(expandPath("/Volumes/Backup/", home)).toBe("/Volumes/Backup");
    expect(expandPath("/", home)).toBe("/");
    expect(expandPath("  /Applications  ", home)).toBe("/Applications");
  });

  test("reads pasted forms of a path", () => {
    expect(expandPath('"/Users/ada/My Files"', home)).toBe("/Users/ada/My Files");
    expect(expandPath("/Users/ada/My\\ Files", home)).toBe("/Users/ada/My Files");
    expect(expandPath("file:///Users/ada/My%20Files/", home)).toBe("/Users/ada/My Files");
  });

  test("rejects text that isn't an absolute path", () => {
    expect(expandPath("Downloads", home)).toBeUndefined();
    expect(expandPath("", home)).toBeUndefined();
    expect(expandPath("~ada/Projects", home)).toBeUndefined();
    expect(expandPath("file://%", home)).toBeUndefined();
  });
});

describe("folderName", () => {
  test("names the home folder in words and other folders by name", () => {
    expect(folderName(home, home)).toBe("your home folder");
    expect(folderName("/Users/ada/Downloads", home)).toBe("Downloads");
    expect(folderName("/Users/ada/Desktop/", home)).toBe("Desktop");
    expect(folderName("/", home)).toBe("/");
  });
});

describe("folderStatus", () => {
  const failing = (code: string) => async () => {
    throw Object.assign(new Error(code), { code });
  };

  test("tells folders from files and missing paths", async () => {
    expect(await folderStatus(tmpdir())).toBe("folder");
    expect(await folderStatus(__filename)).toBe("notFolder");
    expect(await folderStatus(join(tmpdir(), "sizewise-no-such-folder"))).toBe("missing");
    expect(await folderStatus("/x", failing("ENOTDIR"))).toBe("missing");
  });

  test("calls a path macOS won't let Raycast read unreadable, so Sizewise still gets it", async () => {
    expect(await folderStatus("/x", failing("EPERM"))).toBe("unreadable");
    expect(await folderStatus("/x", failing("EACCES"))).toBe("unreadable");
  });
});
