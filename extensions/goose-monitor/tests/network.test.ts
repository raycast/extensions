import { describe, expect, test } from "bun:test";
import { attachNetworkRates, parseCsv, parseNettop } from "../src/lib/network";
import type { AppRow, RawProc } from "../src/lib/types";

const MIB = 1024 * 1024;
const STARTED = "Fri Sep 11 16:01:15 2026";

/* 真实 nettop -n -P -x -d -L 2 -s 1 -t external -J time,bytes_in,bytes_out 输出（-d 给的已是增量）。 */
const NETTOP = [
  "time,,bytes_in,bytes_out,",
  "14:51:41.225299,apsd.395,104431,216985,",
  "14:51:41.225300,1Password.869,8141,4223,",
  "time,,bytes_in,bytes_out,",
  "14:51:42.225299,apsd.395,1000,2000,",
  "14:51:42.225300,1Password.869,\"8,141\",4223,",
].join("\n");

const proc = (over: Partial<RawProc> = {}): RawProc => ({
  pid: 869, ppid: 1, cpu: 0, memBytes: MIB, startedAt: STARTED, uid: 501,
  exe: "/Applications/1Password.app/Contents/MacOS/1Password", name: "1Password", commandLine: "",
  ...over,
});

const row = (over: Partial<AppRow> = {}): AppRow => ({
  id: "g1", identity: "app:/Applications/1Password.app", snapshotToken: "t1", name: "1Password",
  path: "/Applications/1Password.app", pid: 869, allPids: [869], cpu: 0, memBytes: MIB, procs: 1,
  helpers: [], ports: [], protected: false, kind: "app", hasWindow: false, ...over,
});

describe("parseCsv", () => {
  test("处理引号与逗号", () => {
    expect(parseCsv('a,"b,c",d\n')).toEqual([["a", "b,c", "d"]]);
    expect(parseCsv('a,"b""c"\n')).toEqual([["a", 'b"c']]);
  });
});

describe("parseNettop", () => {
  test("取两帧之差算速率（字节/秒）", () => {
    const rates = parseNettop(NETTOP);
    expect(rates).toHaveLength(1);
    const apsd = rates.find((rate) => rate.pid === 395)!;
    expect(apsd.downloadBps).toBeCloseTo(1000, 0);
    expect(apsd.uploadBps).toBeCloseTo(2000, 0);
    // 带引号的千分位数字不是合法计数，整条丢弃
    expect(rates.some((rate) => rate.pid === 869)).toBe(false);
  });

  test("真实 nettop -d 两帧输出：第 1 帧累计值 vs 第 2 帧增量，正确算出瞬时速率且不下溢", () => {
    const fixture = [
      "time,,bytes_in,bytes_out,",
      "15:25:39.366091,apsd.395,169735,301488,",
      "15:25:39.366095,mDNSResponder.490,763439134,15971775,",
      "time,,bytes_in,bytes_out,",
      "15:25:40.368639,apsd.395,0,0,",
      "15:25:40.368644,mDNSResponder.490,16942,0,",
    ].join("\n");
    const rates = parseNettop(fixture);
    expect(rates).toHaveLength(2);
    const apsd = rates.find((r) => r.pid === 395)!;
    expect(apsd.downloadBps).toBe(0);
    expect(apsd.uploadBps).toBe(0);

    const mdns = rates.find((r) => r.pid === 490)!;
    // 增量 16942 字节，时间差 1.002549s，速率 ≈ 16899 B/s（验证不会因累计减增量而下溢）
    expect(mdns.downloadBps).toBeGreaterThan(16000);
    expect(mdns.downloadBps).toBeLessThan(17500);
    expect(mdns.uploadBps).toBe(0);
  });

  test("不足两帧抛错（采样失败 → 能力关）", () => {
    expect(() => parseNettop("time,,bytes_in,bytes_out,\n14:51:41.225299,apsd.395,1,2,\n")).toThrow();
  });
});

describe("attachNetworkRates", () => {
  test("速率按组聚合到 row，PID 复用的速率被丢弃", () => {
    const rows = [row(), row({ id: "g2", pid: 395, allPids: [395] })];
    const rates = [
      { pid: 869, downloadBps: 100, uploadBps: 50 },
      { pid: 395, downloadBps: 900, uploadBps: 0 },
    ];
    const before = [proc(), proc({ pid: 395, startedAt: STARTED })];
    const after = [proc(), proc({ pid: 395, startedAt: "Sat Sep 12 09:00:00 2026" })];
    attachNetworkRates(rows, rates, before, after);

    expect(rows[0].netDown).toBe(100);
    expect(rows[0].netUp).toBe(50);
    expect(rows[1].netDown).toBeUndefined();
    expect(rows[1].netUp).toBeUndefined();
  });
});
