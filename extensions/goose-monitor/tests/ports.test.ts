import { describe, expect, test } from "bun:test";
import { attachListenPorts, collectListenPorts, isServiceRuntime, parseLsof } from "../src/lib/ports";
import type { AppRow } from "../src/lib/types";

const MIB = 1024 * 1024;

const row = (over: Partial<AppRow> = {}): AppRow => ({
  id: "g1",
  identity: "exe:/opt/homebrew/bin/node",
  snapshotToken: "t1",
  name: "node",
  path: "/opt/homebrew/bin/node",
  pid: 4821,
  allPids: [4821],
  cpu: 1,
  memBytes: 100 * MIB,
  procs: 1,
  helpers: [],
  ports: [],
  protected: false,
  kind: "other",
  hasWindow: false,
  ...over,
});

const LSOF = [
  "COMMAND     PID    USER   FD      TYPE             DEVICE SIZE/OFF NODE NAME",
  "node       4821 eachann   23u     IPv6 0x8f7b2c1d      0t0  TCP *:24678 (LISTEN)",
  "node       4821 eachann   24u     IPv4 0x9f7b2c1e      0t0  TCP 127.0.0.1:5173 (LISTEN)",
  "Google     1287 eachann   30u     IPv4 0xaf7b2c1f      0t0  TCP *:5000 (LISTEN)",
  "node       4821 eachann   25u     IPv4 0xbf7b2c20      0t0  TCP 127.0.0.1:5173->127.0.0.1:52000 (ESTABLISHED)",
].join("\n");

describe("parseLsof", () => {
  test("只取 LISTEN，端口去重升序", () => {
    const table = parseLsof(LSOF);
    expect(table.get(4821)).toEqual([5173, 24678]);
    expect(table.get(1287)).toEqual([5000]);
    expect(table.get(9999)).toBeUndefined();
  });

  test("真实 lsof 可跑通", async () => {
    expect(await collectListenPorts()).toBeInstanceOf(Map);
  });
});

describe("attachListenPorts", () => {
  test("服务与非服务进程（Go/Rust/应用）均挂载监听端口", () => {
    const table = parseLsof(LSOF);
    const rows = [row(), row({ id: "g2", name: "Google Chrome", path: "/Applications/Google Chrome.app", pid: 1287, allPids: [1287], kind: "app" })];
    attachListenPorts(rows, table);
    expect(rows[0].ports).toEqual([5173, 24678]);
    expect(rows[1].ports).toEqual([5000]);
  });

  test("Helper 端口单独挂到 helper 上", () => {
    const table = parseLsof(LSOF);
    const rows = [row({ allPids: [4821, 1287], helpers: [{ name: "node", role: "Child", cpu: 0, memBytes: 0, pid: 1287 }] })];
    attachListenPorts(rows, table);
    expect(rows[0].ports).toEqual([5000, 5173, 24678]);
    expect(rows[0].helpers[0].ports).toEqual([5000]);
  });
});

describe("isServiceRuntime", () => {
  test("服务运行时与可执行路径判定", () => {
    expect(isServiceRuntime("node", "/opt/homebrew/bin/node")).toBe(true);
    expect(isServiceRuntime("java", "/usr/bin/java")).toBe(true);
    expect(isServiceRuntime("postgres", "/opt/homebrew/bin/postgres")).toBe(true);
    expect(isServiceRuntime("Google Chrome", "/Applications/Google Chrome.app")).toBe(false);
    expect(isServiceRuntime("Electron", "/Users/me/app/node_modules/.bin/vite")).toBe(true);
  });
});
