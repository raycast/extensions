import { beforeEach, describe, expect, test, vi } from "vitest";

const { runRemoteMock } = vi.hoisted(() => ({ runRemoteMock: vi.fn() }));

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ sshHost: "xkeen" }) }));
vi.mock("../ssh", () => ({ runRemote: runRemoteMock }));

import { createRemoteBackup } from "../files";

beforeEach(() => {
  runRemoteMock.mockReset();
});

describe("createRemoteBackup", () => {
  test("returns the created backup path parsed from stdout", async () => {
    runRemoteMock.mockResolvedValue({
      stdout: "/opt/etc/xray/configs-profiles/.raycast-backups/05_routing.json.20260101-000000.manual.bak\n",
      stderr: "",
    });

    const result = await createRemoteBackup("/opt/etc/xray/configs/05_routing.json", "manual");

    expect(result).toBe("/opt/etc/xray/configs-profiles/.raycast-backups/05_routing.json.20260101-000000.manual.bak");
  });

  test("sends a single remote command that prunes old backups after a successful cp", async () => {
    runRemoteMock.mockResolvedValue({ stdout: "/some/backup.bak\n", stderr: "" });

    await createRemoteBackup("/opt/etc/xray/configs/05_routing.json", "manual");

    expect(runRemoteMock).toHaveBeenCalledTimes(1);
    const [cmd] = runRemoteMock.mock.calls[0];

    // The prune loop runs after `cp`, keeps the 20 newest per BASE, and uses
    // `rm -f` (never xargs -r, which isn't available on BusyBox). The keep-check
    // must be `[ ... ] || rm` (not `&& rm`): with `set -e`, a final failing `[ -gt ]`
    // makes the whole script exit non-zero when there are <= 20 backups.
    expect(cmd).toContain('cp "$SRC" "$DEST"');
    expect(cmd.indexOf('cp "$SRC" "$DEST"')).toBeLessThan(cmd.indexOf("rm -f"));
    expect(cmd).toContain("-le 20");
    expect(cmd).toContain("sort -r");
    expect(cmd).not.toContain("xargs");
  });

  test("returns null when the source file does not exist (no backup line in stdout)", async () => {
    runRemoteMock.mockResolvedValue({ stdout: "", stderr: "" });
    const result = await createRemoteBackup("/opt/etc/xray/configs/05_routing.json", "manual");
    expect(result).toBeNull();
  });
});
