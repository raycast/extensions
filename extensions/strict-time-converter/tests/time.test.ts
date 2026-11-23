import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTime, parseInput } from "../src/lib/time";
import type { DateOrder } from "../src/lib/calendar";

function milliseconds(
  input: string,
  timezone = "Asia/Shanghai",
  order: DateOrder = "auto",
) {
  const result = parseInput(input, timezone, Date.now(), order);
  assert.ok(result.ok, JSON.stringify(result));
  return result.milliseconds;
}

describe("Unix 秒和毫秒自动识别", () => {
  it("10 位秒和 13 位毫秒表示同一时刻", () => {
    assert.equal(milliseconds("1700000000"), 1700000000000);
    assert.equal(milliseconds("1700000000000"), 1700000000000);
    const result = parseInput("1700000000");
    assert.equal(result.ok && result.source, "seconds");
  });
  it("保留毫秒精度", () => {
    assert.equal(milliseconds("1700000000123"), 1700000000123);
    assert.equal(milliseconds("1700000000.123"), 1700000000123);
    assert.equal(milliseconds("1700000000.001s"), 1700000000001);
    assert.equal(milliseconds("1.009s"), 1009);
  });
  it("支持显式单位、零、负数和较早的秒级时间戳", () => {
    assert.equal(milliseconds("0"), 0);
    assert.equal(milliseconds("946684800"), 946684800000);
    assert.equal(milliseconds("1700000000000 ms"), 1700000000000);
    assert.equal(milliseconds("1000毫秒"), 1000);
    assert.equal(milliseconds("1000秒"), 1000000);
    assert.equal(milliseconds("-1"), -1000);
    assert.equal(milliseconds("-0.001s"), -1);
    assert.equal(milliseconds("-1.009s"), -1009);
  });
  it("11/12 位默认视为毫秒，允许通过 s 后缀覆盖", () => {
    assert.equal(milliseconds("10000000000"), 10000000000);
    assert.equal(milliseconds("100000000000"), 100000000000);
    assert.equal(milliseconds("10000000000s"), 10000000000000);
  });
  it("清理外侧空白和配对引号", () => {
    assert.equal(milliseconds('  "1700000000000"  '), 1700000000000);
    assert.equal(milliseconds("'1700000000'"), 1700000000000);
    assert.equal(milliseconds("`1700000000`"), 1700000000000);
  });
  it("拒绝微秒、纳秒、精度损失和越界", () => {
    for (const input of [
      "1700000000000000",
      "1700000000000000000",
      "1.5ms",
      "1.0001s",
      "8640000000000001ms",
    ]) {
      assert.equal(parseInput(input).ok, false, input);
    }
  });
  it("保留 Date 范围边界的精确整数", () => {
    assert.equal(milliseconds("8640000000000000ms"), 8640000000000000);
    assert.equal(milliseconds("-8640000000000000ms"), -8640000000000000);
  });
  it("留空和 now 返回给定的当前时刻", () => {
    for (const input of ["", " ", "now", "NOW", "现在", "当前"]) {
      assert.deepEqual(parseInput(input, "UTC", 1700000000123), {
        ok: true,
        milliseconds: 1700000000123,
        source: "current",
      });
    }
  });
});

describe("日期和时区", () => {
  it("不带时区的日期按所选时区解析", () => {
    assert.equal(milliseconds("2023-11-15 06:13:20"), 1700000000000);
    assert.equal(milliseconds("2023-11-14 22:13:20", "UTC"), 1700000000000);
    assert.equal(milliseconds("2023-11-15 06:13:20", "UTC"), 1700028800000);
  });
  it("ISO 中的显式时区优先于所选时区", () => {
    for (const input of [
      "2023-11-14T22:13:20Z",
      "2023-11-15T06:13:20+08:00",
      "2023-11-15T06:13:20+0800",
      "2023-11-14T17:13:20-05:00",
    ]) {
      assert.equal(milliseconds(input), 1700000000000, input);
    }
    assert.equal(milliseconds("2023-11-14T22:13:20.123Z"), 1700000000123);
    assert.equal(milliseconds("2023-11-14T22:13:20.1Z"), 1700000000100);
  });
  it("支持日期、分钟精度和斜杠日期", () => {
    assert.equal(milliseconds("1970-01-01", "UTC"), 0);
    assert.equal(milliseconds("1970/1/1 08:00"), 0);
    assert.equal(milliseconds("2024-02-29", "UTC"), Date.UTC(2024, 1, 29));
  });
  it("拒绝无效日期，不自动滚到下个月", () => {
    for (const input of [
      "2023-02-29",
      "2024-02-30",
      "2026-13-01",
      "2026-00-01",
      "2026-01-00",
      "2026-04-31",
      "2026-10-15 24:00:00",
      "2026-10-15 12:60:00",
      "2026-10-15 12:00:60",
      "2026-10-15T12:00:00+25:00",
      "2026-10-15T12:00:00+08:60",
      "2026-10/15",
      "abc",
      "Infinity",
      "1e12",
      "2026-10-15 12:00:00.1234",
    ]) {
      assert.equal(parseInput(input).ok, false, input);
    }
  });
  it("拒绝夏令时跳过的时间和没有时区偏移的重复时间", () => {
    assert.equal(
      parseInput("2026-03-08 02:30:00", "America/New_York").ok,
      false,
    );
    assert.equal(
      parseInput("2026-11-01 01:30:00", "America/New_York").ok,
      false,
    );
    const first = milliseconds("2026-11-01T01:30:00-04:00");
    const second = milliseconds("2026-11-01T01:30:00-05:00");
    assert.equal(second - first, 3600000);
  });
  it("对系统本地时区也能往返转换", () => {
    const formatted = formatTime(1700000000123, "local");
    assert.equal(milliseconds(formatted.dateTime, "local"), 1700000000123);
  });
  it("拒绝异常长度的输入", () => {
    assert.equal(parseInput("9".repeat(1000)).ok, false);
  });
});

describe("显示和复制结果", () => {
  it("秒、毫秒、北京时间、UTC、ISO 8601 结果一致", () => {
    assert.deepEqual(formatTime(1700000000123), {
      dateTime: "2023-11-15 06:13:20.123",
      timezone: "Asia/Shanghai",
      offset: "UTC+08:00",
      seconds: "1700000000",
      milliseconds: "1700000000123",
      iso: "2023-11-14T22:13:20.123Z",
      utc: "2023-11-14 22:13:20.123",
      hasMilliseconds: true,
      localIso: "2023-11-15T06:13:20.123+08:00",
      rfc2822: "Wed, 15 Nov 2023 06:13:20 +0800",
      http: "Tue, 14 Nov 2023 22:13:20 GMT",
      compact: "20231115061320",
    });
  });
  it("正确显示 UTC 的午夜和零毫秒", () => {
    const formatted = formatTime(0, "UTC");
    assert.equal(formatted.dateTime, "1970-01-01 00:00:00.000");
    assert.equal(formatted.seconds, "0");
    assert.equal(formatted.hasMilliseconds, false);
  });
  it("负数的秒级时间戳向下取整", () => {
    assert.equal(formatTime(-1, "UTC").seconds, "-1");
    assert.equal(formatTime(-1, "UTC").iso, "1969-12-31T23:59:59.999Z");
  });
});

describe("常见日期表示方式", () => {
  const expected = Date.UTC(2026, 9, 15, 4);
  for (const input of [
    "2026.10.15 12:00:00",
    "2026年10月15日 12:00:00",
    "2026年10月15日 下午12点00分00秒",
    "2026-10-15 12:00 PM",
    "October 15, 2026 12:00 PM",
    "Oct 15, 2026 12:00:00",
    "15 October 2026 12:00:00",
    "Thu, 15 Oct 2026 12:00:00 +0800",
    "Thu, 15 Oct 2026 04:00:00 GMT",
    "Thu Oct 15 12:00:00 2026",
    "Thu Oct 15 2026 12:00:00 GMT+0800 (China Standard Time)",
    "10/15/2026 12:00:00",
    "15/10/2026 12:00:00",
    "20261015120000",
    "20261015T120000+0800",
    "2026-W42-4T12:00:00+08:00",
    "2026-288T12:00:00+08:00",
    "2026-10-15 04:00:00 UTC",
  ]) {
    it(`正确解析 ${input}`, () => assert.equal(milliseconds(input), expected));
  }
  it("中文上午、下午与 12 小时制转换一致", () => {
    assert.equal(
      milliseconds("2026年10月15日 下午3点04分05秒"),
      Date.UTC(2026, 9, 15, 7, 4, 5),
    );
    assert.equal(
      milliseconds("2026年10月15日 上午12点"),
      Date.UTC(2026, 9, 14, 16),
    );
    assert.equal(
      milliseconds("2026-10-15 12:00 AM"),
      Date.UTC(2026, 9, 14, 16),
    );
    assert.equal(
      milliseconds("2026-10-15 1:04:05 pm"),
      Date.UTC(2026, 9, 15, 5, 4, 5),
    );
  });
  it("紧凑日期需要前缀，纯 8 位数字仍保持 Unix 秒含义", () => {
    assert.equal(milliseconds("date:20261015"), Date.UTC(2026, 9, 14, 16));
    assert.equal(milliseconds("20261015"), 20261015000);
    assert.equal(milliseconds("date:20261015120000"), expected);
  });
  it("歧义日期默认拒绝，显式前缀或偏好可以指定顺序", () => {
    assert.equal(parseInput("03/04/2026").ok, false);
    assert.equal(milliseconds("us:03/04/2026", "UTC"), Date.UTC(2026, 2, 4));
    assert.equal(milliseconds("eu:03/04/2026", "UTC"), Date.UTC(2026, 3, 3));
    assert.equal(
      milliseconds("03/04/2026", "UTC", "MDY"),
      Date.UTC(2026, 2, 4),
    );
    assert.equal(
      milliseconds("03/04/2026", "UTC", "DMY"),
      Date.UTC(2026, 3, 3),
    );
    assert.equal(
      milliseconds("us:03/04/2026", "UTC", "DMY"),
      Date.UTC(2026, 2, 4),
    );
    assert.equal(milliseconds("03/03/2026", "UTC"), Date.UTC(2026, 2, 3));
  });
  it("新增格式仍拒绝无效日期、错误星期和时区缩写歧义", () => {
    for (const input of [
      "2026年2月30日",
      "February 30, 2026",
      "Fri, 15 Oct 2026 12:00:00 +0800",
      "Thu, 15 Oct 2026 12:00:00 CST",
      "2026-W54-1",
      "2026-366",
      "date:20260230",
      "2026-10-15 0:00 PM",
      "2026-10-15 13:00 AM",
      "13/14/2026",
      "Janua 15, 2026",
    ]) {
      assert.equal(parseInput(input).ok, false, input);
    }
  });
  it("新增格式仍检查夏令时缺口和重复时间", () => {
    assert.equal(
      parseInput("March 8, 2026 2:30 AM", "America/New_York").ok,
      false,
    );
    assert.equal(
      parseInput("us:11/01/2026 1:30 AM", "America/New_York").ok,
      false,
    );
  });
  it("中文上午/下午与显式时区可以同时使用", () => {
    assert.equal(
      milliseconds("2026年10月15日 下午3点04分05秒 +08:00", "UTC"),
      Date.UTC(2026, 9, 15, 7, 4, 5),
    );
    assert.equal(
      milliseconds("2026年10月15日 下午3:04:05 UTC"),
      Date.UTC(2026, 9, 15, 15, 4, 5),
    );
  });
  it("新增输出可以往返转换；秒精度格式明确截去毫秒", () => {
    const formatted = formatTime(expected + 123);
    assert.equal(milliseconds(formatted.localIso), expected + 123);
    assert.equal(milliseconds(formatted.rfc2822), expected);
    assert.equal(milliseconds(formatted.http), expected);
    assert.equal(milliseconds(formatted.compact), expected);
  });
});
