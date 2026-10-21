import { describe, expect, it } from "vitest";
import { formatDate, renderTemplate } from "../src/core/docs/docs";

// 本地时区的 2026-03-09 14:05，周一。
const date = new Date(2026, 2, 9, 14, 5);

describe("formatDate", () => {
  it("数字记号：补零与不补零", () => {
    expect(formatDate(date, "YYYY-MM-DD")).toBe("2026-03-09");
    expect(formatDate(date, "YY/M/D")).toBe("26/3/9");
    expect(formatDate(date, "HH:mm")).toBe("14:05");
  });

  it("英文月份与星期", () => {
    expect(formatDate(date, "MMMM D, YYYY")).toBe("March 9, 2026");
    expect(formatDate(date, "ddd, MMM D")).toBe("Mon, Mar 9");
    expect(formatDate(date, "dddd")).toBe("Monday");
  });

  it("方括号内文字与不认识的字符原样保留", () => {
    expect(formatDate(date, "[Week of] YYYY.MM.DD")).toBe("Week of 2026.03.09");
    expect(formatDate(date, "YYYY年M月D日")).toBe("2026年3月9日");
  });
});

describe("renderTemplate", () => {
  it("不带格式时用默认格式", () => {
    expect(renderTemplate("{{date}} {{time}}", { title: "Song" }, date)).toBe("2026-03-09 14:05");
  });

  it("`套用自定义格式", () => {
    expect(renderTemplate("{{date:YYYY/MM/DD}} {{time:HH.mm}}", { title: "Song" }, date)).toBe("2026/03/09 14.05");
  });

  it("标题里的占位符不会被二次替换", () => {
    expect(renderTemplate("{{title}} — {{date}}", { title: "Money $$ {{date}}" }, date)).toBe(
      "Money $$ {{date}} — 2026-03-09",
    );
  });
});
