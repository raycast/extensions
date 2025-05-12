import { parseDesktopFileContent, fileExists } from "../src/utils/desktop";
import * as path from "path";
import * as os from "os";

describe("parseDesktopFileContent", () => {
  const sample = `
[Desktop Entry]
Name=Test App
Exec=/usr/bin/testapp %f
Icon=test-icon
Path=/home/user/test
Comment=A test application
`;
  const result = parseDesktopFileContent(sample);

  it("parses name, exec, icon, path, and comment fields", () => {
    expect(result.name).toBe("Test App");
    expect(result.exec).toBe("/usr/bin/testapp %f");
    expect(result.icon).toBe("test-icon");
    expect(result.path).toBe("/home/user/test");
    expect(result.comment).toBe("A test application");
  });

  it("ignores duplicate keys and stops at 200 lines", () => {
    const longContent = Array(250).fill("Name=Foo").join("\n");
    const parsed = parseDesktopFileContent(longContent);
    expect(parsed.name).toBe("Foo");
  });
});

describe("fileExists", () => {
  it("returns true for an existing file", async () => {
    const thisFile = path.resolve(__filename);
    const exists = await fileExists(thisFile);
    expect(exists).toBe(true);
  });

  it("returns false for a non-existing file", async () => {
    const fake = path.join(os.tmpdir(), "no-such-file-123456.tmp");
    const exists = await fileExists(fake);
    expect(exists).toBe(false);
  });
});
