import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "../src/lib/date-tools";
import { factorize, fromRoman, gcd, lcm, toRoman } from "../src/lib/math-tools";
import { analyzeText, convertCase, numberToPortuguese, reverseText, sortLines } from "../src/lib/text-tools";

describe("utilitários", () => {
  it("converte números romanos nos dois sentidos", () => {
    expect(toRoman(2026)).toBe("MMXXVI");
    expect(fromRoman("MMXXVI")).toBe(2026);
  });

  it("calcula fatoração, MDC e MMC", () => {
    expect(factorize(360)).toBe("360 = 2^3 × 3^2 × 5");
    expect(gcd(24, 36)).toBe(12);
    expect(lcm([4, 6, 10])).toBe(60);
  });

  it("trata texto Unicode", () => {
    expect(reverseText("Olá 👨‍💻")).toBe("👨‍💻 álO");
    expect(sortLines("zebra\nÁrvore\nbola")).toBe("Árvore\nbola\nzebra");
    expect(convertCase("Diploma Digital MEC", "snake")).toBe("diploma_digital_mec");
    expect(JSON.parse(analyzeText("Olá mundo")).palavras).toBe(2);
    expect(numberToPortuguese("1234")).toBe("mil duzentos e trinta e quatro");
  });

  it("calcula datas sem depender de horário de verão", () => {
    const start = new Date("2026-09-01T00:00:00Z");
    const end = new Date("2026-09-04T23:59:59Z");
    expect(daysBetween(start, end, false)).toBe(3);
    expect(addDays(start, 10).toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });
});
