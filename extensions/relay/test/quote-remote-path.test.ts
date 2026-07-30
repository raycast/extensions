import { beforeEach, describe, expect, test, vi } from "vitest";
import { quoteRemotePath, uploadFile } from "../src/upload-clipboard-file";

const mocks = vi.hoisted(() => ({
  clipboardCopy: vi.fn(),
  execFile: vi.fn((...args: unknown[]) => {
    const callback = args.at(-1) as (error: null, stdout: string, stderr: string) => void;
    callback(null, "", "");
  }),
  showHUD: vi.fn(),
  toast: { hide: vi.fn(), message: "", style: "", title: "" },
}));

vi.mock("node:child_process", () => ({ execFile: mocks.execFile }));
vi.mock("@raycast/api", () => ({
  Clipboard: { copy: mocks.clipboardCopy },
  Toast: { Style: { Animated: "animated", Failure: "failure" } },
  getPreferenceValues: () => ({
    remoteDirectory: "~user$(command)/uploads",
    remoteHost: "example-host",
  }),
  showHUD: mocks.showHUD,
  showToast: () => mocks.toast,
}));

describe("quoteRemotePath", () => {
  test.each([
    ["~/relay/uploads", "~/'relay/uploads'"],
    ["~deploy/relay/uploads", "~deploy/'relay/uploads'"],
    ["~", "~"],
    ["~deploy", "~deploy"],
    ["/srv/relay uploads", "'/srv/relay uploads'"],
    ["/srv/team's/uploads", "'/srv/team'\\''s/uploads'"],
  ])("quotes safe path %j as one shell word", (path, expected) => {
    expect(quoteRemotePath(path)).toBe(expected);
  });

  test.each([
    ["~user$(command)/uploads", "'~user$(command)/uploads'"],
    ["~user`command`/uploads", "'~user`command`/uploads'"],
    ["~user;command/uploads", "'~user;command/uploads'"],
    ["~user&&command/uploads", "'~user&&command/uploads'"],
    ["~user|command/uploads", "'~user|command/uploads'"],
    ["~user>file/uploads", "'~user>file/uploads'"],
    ["~user\ncommand/uploads", "'~user\ncommand/uploads'"],
    ["~user name/uploads", "'~user name/uploads'"],
  ])("quotes unsafe tilde prefix %j literally", (path, expected) => {
    expect(quoteRemotePath(path)).toBe(expected);
  });
});

describe("uploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(123);
  });

  test("passes the malicious destination literally to both SSH and SCP", async () => {
    await uploadFile("/tmp/image.png");

    expect(mocks.execFile).toHaveBeenNthCalledWith(
      1,
      "/usr/bin/ssh",
      ["example-host", "mkdir", "-p", "'~user$(command)/uploads'"],
      expect.any(Function),
    );
    expect(mocks.execFile).toHaveBeenNthCalledWith(
      2,
      "/usr/bin/scp",
      ["/tmp/image.png", "example-host:'~user$(command)/uploads/clipboard-123.png'"],
      expect.any(Function),
    );
    expect(mocks.clipboardCopy).toHaveBeenCalledWith("~user$(command)/uploads/clipboard-123.png");
  });
});
