import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({ sshHost: "xkeen" }) }));

const readRemoteFileMock = vi.fn();
const safeWriteRemoteFileMock = vi.fn();
vi.mock("../files", () => ({
  readRemoteFile: (...args: unknown[]) => readRemoteFileMock(...args),
  safeWriteRemoteFile: (...args: unknown[]) => safeWriteRemoteFileMock(...args),
}));

import { applyQuickAdd } from "../quickadd";
import { tryParseJson } from "../json";

const routingText = `{
  "routing": {
    "rules": [
      // 1. Proxy sites (proxy domain)
      {
        "type": "field",
        "inboundTag": ["redirect", "tproxy"],
        "outboundTag": "vless-reality",
        "domain": [
          "domain:openai.com"
        ]
      },
      // 2. Countries (proxy ip)
      {
        "type": "field",
        "inboundTag": ["redirect", "tproxy"],
        "outboundTag": "vless-reality",
        "ip": [
          "ext:geoip_v2fly.dat:telegram"
        ]
      }
    ]
  }
}`;

beforeEach(() => {
  readRemoteFileMock.mockReset();
  safeWriteRemoteFileMock.mockReset();
  readRemoteFileMock.mockResolvedValue(routingText);
  safeWriteRemoteFileMock.mockResolvedValue({ backupPath: "/backups/mock.bak" });
});

describe("applyQuickAdd", () => {
  test("rejects an entry type that does not match the category field", async () => {
    await expect(applyQuickAdd({ rawInput: "example.com", entryType: "domain", categoryNumber: 2 })).rejects.toThrow(
      /not valid for/,
    );
    expect(safeWriteRemoteFileMock).not.toHaveBeenCalled();
  });

  test("adds entries and defers the restart by default (form UI path)", async () => {
    const result = await applyQuickAdd({ rawInput: "example.com", entryType: "domain", categoryNumber: 1 });
    expect(result.added).toBe(1);
    expect(result.restarted).toBe(false);
    const [, , options] = safeWriteRemoteFileMock.mock.calls[0];
    expect(options).toMatchObject({ backupTag: "quick-add", restartAfterWrite: false });
  });

  test("restarts after write when requested (AI tool path)", async () => {
    const result = await applyQuickAdd({
      rawInput: "ru",
      entryType: "geoip",
      categoryNumber: 2,
      restartAfterWrite: true,
    });
    expect(result.restarted).toBe(true);
    const [, , options] = safeWriteRemoteFileMock.mock.calls[0];
    expect(options).toMatchObject({ restartAfterWrite: true });
  });

  test("escapes backslashes in regexp values so the result stays valid JSON", async () => {
    await applyQuickAdd({ rawInput: "regexp:\\.example\\.com$", entryType: "domain", categoryNumber: 1 });
    const [, written] = safeWriteRemoteFileMock.mock.calls[0] as [string, string, unknown];
    const parsed = tryParseJson(written);
    expect(parsed.ok).toBe(true);
    expect(written).toContain('"regexp:\\\\.example\\\\.com$"');
  });
});
