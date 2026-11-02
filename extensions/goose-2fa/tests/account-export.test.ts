import { describe, expect, test } from "bun:test";
import { accountExportHeadingDataUrl, accountQrDataUrl, accountSetupUri } from "../src/lib/account-export";
import { parseOtpAuthUri } from "../vendor/lib/otp";
import type { AccountData } from "../vendor/lib/types";

function account(overrides: Partial<AccountData> = {}): AccountData {
  return {
    id: "export-test",
    createdAt: 1,
    name: "alice@example.com",
    issuer: "Example",
    secret: "A".repeat(32),
    type: "totp",
    digits: 6,
    period: 30,
    counter: 0,
    algorithm: "SHA-1",
    ...overrides,
  };
}

function otpFields(value: AccountData) {
  const { name, issuer, secret, type, digits, period, counter, algorithm } = value;
  return { name, issuer, secret, type, digits, period, counter, algorithm };
}

describe("账户二维码与导入链接", () => {
  test("居中标题转义用户文本，长 Unicode 名称不会注入 SVG 或超出边界", () => {
    for (const theme of ["light", "dark"] as const) {
      const input = account({ issuer: '& <image href="https://example.com/private"/> 中文', name: "😀".repeat(70) });
      const url = accountExportHeadingDataUrl(input, theme);
      const svg = Buffer.from(url.split(",")[1]!, "base64").toString();
      expect(svg).not.toContain("<image");
      expect(svg).toContain("&lt;image");
      expect(svg).toContain("&amp;");
      expect(svg).toContain("…</text>");
      expect(svg).not.toContain("�");
      expect(input.name).toBe("😀".repeat(70));
    }
  });

  test("默认 TOTP 可完整回导，且不泄露应用专用元数据", () => {
    const input = account({ note: "private note", remark: "private remark", groupId: "private-group" });
    const uri = accountSetupUri(input);
    const params = new URLSearchParams(uri.split("?")[1]);

    expect(parseOtpAuthUri(uri)).toMatchObject(otpFields(input));
    expect(params.has("counter")).toBe(false);
    for (const field of ["id", "createdAt", "note", "remark", "groupId"]) {
      expect(params.has(field)).toBe(false);
    }
  });

  test("非默认 TOTP 算法、位数和周期在回导后保持一致", () => {
    for (const algorithm of ["SHA-256", "SHA-512"] as const) {
      const input = account({ algorithm, digits: 8, period: 60 });
      const uri = accountSetupUri(input);
      expect(parseOtpAuthUri(uri)).toMatchObject(otpFields(input));
      expect(new URLSearchParams(uri.split("?")[1]).get("algorithm")).toBe(algorithm.replace("-", ""));
    }
  });

  test("HOTP 导出零值和大计数器，且不递增原账户", () => {
    for (const counter of [0, Number.MAX_SAFE_INTEGER]) {
      const input = Object.freeze(account({ type: "hotp", counter, algorithm: "SHA-512", digits: 8 }));
      const uri = accountSetupUri(input);
      const params = new URLSearchParams(uri.split("?")[1]);

      expect(parseOtpAuthUri(uri)).toMatchObject(otpFields(input));
      expect(params.get("counter")).toBe(String(counter));
      expect(params.has("period")).toBe(false);
      expect(input.counter).toBe(counter);
    }
  });

  test("中文和 URI 特殊字符正确编码，空发行方不会被补写", () => {
    for (const issuer of ["鹅笔记 & 工作/?", ""]) {
      const input = account({ name: "张三 + alice@example.com /?&=", issuer });
      const uri = accountSetupUri(input);
      expect(parseOtpAuthUri(uri)).toMatchObject(otpFields(input));
      expect(new URLSearchParams(uri.split("?")[1]).has("issuer")).toBe(Boolean(issuer));
    }
  });

  test("冒号仅在导出标签中替换为全角，不修改保存的账户", () => {
    for (const issuer of ["Example:Work:Team", ""]) {
      const input = Object.freeze(account({ name: "alice:phone:2", issuer }));
      const before = structuredClone(input);
      const uri = accountSetupUri(input);

      expect(parseOtpAuthUri(uri)).toMatchObject({
        ...otpFields(input),
        name: "alice：phone：2",
        issuer: issuer.replace(/:/g, "："),
      });
      expect(input).toEqual(before);
    }
  });

  test("二维码在本地生成有效 PNG", async () => {
    const dataUrl = await accountQrDataUrl(accountSetupUri(account()));
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  test("超容量二维码失败后仍保留完整可回导的链接", async () => {
    const input = account({ name: "名".repeat(300), issuer: "鹅".repeat(200), secret: "A".repeat(256) });
    const uri = accountSetupUri(input);

    expect(parseOtpAuthUri(uri)).toMatchObject(otpFields(input));
    await expect(accountQrDataUrl(uri)).rejects.toThrow();
    expect(parseOtpAuthUri(uri)).toMatchObject(otpFields(input));
    expect(input.name).toHaveLength(300);
    expect(input.issuer).toHaveLength(200);
  });
});
