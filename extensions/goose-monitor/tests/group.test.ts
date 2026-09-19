import { describe, expect, test } from "bun:test";
import { appBundle, groupProcesses } from "../src/lib/group";
import type { AppRow, RawProc } from "../src/lib/types";

const MIB = 1024 * 1024;
const MY_UID = process.getuid?.() ?? 501;

const proc = (over: Partial<RawProc> = {}): RawProc => ({
  pid: 100,
  ppid: 1,
  cpu: 1,
  memBytes: 100 * MIB,
  startedAt: "Fri Sep 11 16:01:15 2026",
  uid: MY_UID,
  exe: "",
  name: "",
  commandLine: "",
  ...over,
});

const byName = (rows: AppRow[]): Record<string, AppRow> =>
  Object.fromEntries(rows.map((row) => [row.name, row]));

const WECHAT = "/Applications/企业微信.app/Contents/MacOS/企业微信";
const WECHAT_HELPER = "/Applications/企业微信.app/Contents/Frameworks/企业微信 Helper.app/Contents/MacOS/企业微信 Helper";

describe("appBundle", () => {
  test(".app bundle 路径作为分组键，含中文名", () => {
    expect(appBundle(WECHAT)).toEqual({ bundle: "/Applications/企业微信.app", name: "企业微信" });
    expect(appBundle(WECHAT_HELPER)).toEqual({ bundle: "/Applications/企业微信.app", name: "企业微信" });
    expect(appBundle("/opt/homebrew/bin/node")).toBeNull();
    expect(appBundle("")).toBeNull();
  });
});

describe("groupProcesses", () => {
  test("同一 bundle 的主进程与 Helper 合并成一行", () => {
    const rows = groupProcesses([
      proc({ pid: 100, exe: WECHAT, name: "企业微信", memBytes: 300 * MIB }),
      proc({ pid: 101, ppid: 100, exe: WECHAT_HELPER, name: "企业微信 Helper", memBytes: 200 * MIB }),
      proc({ pid: 102, ppid: 100, exe: WECHAT_HELPER, name: "企业微信 Helper (GPU)", memBytes: 100 * MIB, commandLine: `${WECHAT_HELPER} --type=gpu-process` }),
    ]);

    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.identity).toBe("app:/Applications/企业微信.app");
    expect(row.name).toBe("企业微信");
    expect(row.iconPath).toBe("/Applications/企业微信.app");
    // 成员按内存降序：主进程在前
    expect(row.allPids).toEqual([100, 101, 102]);
    expect(row.procs).toBe(3);
    expect(row.pid).toBe(100);
    expect(row.memBytes).toBe(600 * MIB);
    expect(row.helpers.map((helper) => helper.role)).toEqual(["Main Process", "Helper", "GPU"]);
  });

  test("非 bundle 程序只归并同一 exe 的同一棵进程树", () => {
    const node = "/opt/homebrew/bin/node";
    const rows = groupProcesses([
      proc({ pid: 10, ppid: 1, exe: node, name: "node" }),
      proc({ pid: 11, ppid: 10, exe: node, name: "node" }),
      proc({ pid: 20, ppid: 1, exe: node, name: "node" }),
    ]);
    expect(rows.map((row) => row.allPids).sort((a, b) => a[0] - b[0])).toEqual([[10, 11], [20]]);
  });

  test("snapshotToken 随成员/启动时间变化，id 保持稳定", () => {
    const foo = (pid: number, startedAt?: string): RawProc =>
      proc({ pid, exe: "/Applications/Foo.app/Contents/MacOS/Foo", name: "Foo", ...(startedAt ? { startedAt } : {}) });

    const base = groupProcesses([foo(100)])[0];
    const restarted = groupProcesses([foo(100, "Sat Sep 12 10:00:00 2026")])[0];
    const reused = groupProcesses([foo(200)])[0];

    expect(reused.id).toBe(base.id);
    expect(reused.snapshotToken).not.toBe(base.snapshotToken);
    expect(restarted.snapshotToken).not.toBe(base.snapshotToken);
  });

  test("kind：系统后台 bg / 应用 app / 用户脚本 other", () => {
    const rows = byName(groupProcesses([
      proc({ pid: 50, exe: "/usr/sbin/sshd", name: "sshd" }),
      proc({ pid: 51, exe: "/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder", name: "Finder" }),
      proc({ pid: 52, exe: "/Applications/Slack.app/Contents/MacOS/Slack", name: "Slack" }),
      proc({ pid: 53, exe: "/opt/homebrew/bin/node", name: "node", commandLine: "node server.js" }),
    ]));

    expect(rows.sshd.kind).toBe("bg");
    expect(rows.Finder.kind).toBe("app");       // 图形系统应用不算后台
    expect(rows.Slack.kind).toBe("app");
    expect(rows.node.kind).toBe("other");
    expect(rows.sshd.hasWindow).toBe(false);
  });

  test("protected：内核、关键进程名、非当前用户所有，附带英文原因", () => {
    const rows = byName(groupProcesses([
      proc({ pid: 0, exe: "", name: "kernel_task" }),
      proc({ pid: 1, exe: "/sbin/launchd", name: "launchd" }),
      proc({ pid: 60, exe: "/System/Library/PrivateFrameworks/SkyLight.framework/WindowServer", name: "WindowServer" }),
      proc({ pid: 61, exe: "/usr/libexec/logd", name: "logd", uid: MY_UID + 1 }),
      proc({ pid: 62, exe: "/Applications/Slack.app/Contents/MacOS/Slack", name: "Slack" }),
    ]));

    expect(rows.kernel_task.protected).toBe(true);
    expect(rows.kernel_task.protectedReason).toBe("PID 0–1");
    expect(rows.launchd.protected).toBe(true);
    expect(rows.launchd.protectedReason).toBe("PID 0–1");
    expect(rows.WindowServer.protected).toBe(true);
    expect(rows.WindowServer.protectedReason).toBe("system process");
    expect(rows.logd.protected).toBe(true);
    expect(rows.logd.protectedReason).toBe("another user");
    expect(rows.Slack.protected).toBe(false);
    expect(rows.Slack.protectedReason).toBeUndefined();
  });
});
