import { describe, expect, it } from "vitest";
import { formatDate, formatTime } from "@/core/ui/shared/format";

describe("formatDate", () => {
  it("按本地时间补零成 YYYY-MM-DD", () => {
    expect(formatDate(new Date(2026, 0, 5).getTime())).toBe("2026-01-05");
    expect(formatDate(new Date(2026, 11, 31).getTime())).toBe("2026-12-31");
  });

  it("同一天的不同时刻得到同一个日期", () => {
    expect(formatDate(new Date(2026, 5, 1, 0, 0, 0).getTime())).toBe("2026-06-01");
    expect(formatDate(new Date(2026, 5, 1, 23, 59, 59).getTime())).toBe("2026-06-01");
  });

  it("1970 年之前也能显示", () => {
    expect(formatDate(new Date(1969, 6, 20).getTime())).toBe("1969-07-20");
  });
});

describe("formatTime", () => {
  it("分:秒，秒补两位", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
  });

  it("小数秒向下取整", () => {
    expect(formatTime(65.9)).toBe("1:05");
  });

  it("负数、NaN、Infinity 都当 0", () => {
    expect(formatTime(-1)).toBe("0:00");
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  });

  it("超过一小时仍按分钟累计", () => {
    expect(formatTime(3661)).toBe("61:01");
  });
});
