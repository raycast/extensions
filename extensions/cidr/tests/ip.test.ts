import { validateIPv4 } from "../src/utils/validation-utils";

describe("ip validation", function () {
  it("10.0.0.0", function () {
    const str = "10.0.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([10, 0, 0, 0]);
  });

  it("192.168.0.0", function () {
    const str = "192.168.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([192, 168, 0, 0]);
  });

  it("172.16.0.0", function () {
    const str = "172.16.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([172, 16, 0, 0]);
  });

  it("10.10.0.0", function () {
    const str = "10.10.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([10, 10, 0, 0]);
  });

  it("192.0.2.0", function () {
    const str = "192.0.2.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([192, 0, 2, 0]);
  });

  it("203.0.113.0", function () {
    const str = "203.0.113.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([203, 0, 113, 0]);
  });

  it("198.51.100.0", function () {
    const str = "198.51.100.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([198, 51, 100, 0]);
  });

  it("172.18.0.0", function () {
    const str = "172.18.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([172, 18, 0, 0]);
  });

  it("10.20.30.0", function () {
    const str = "10.20.30.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([10, 20, 30, 0]);
  });

  it("192.168.1.0", function () {
    const str = "192.168.1.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([192, 168, 1, 0]);
  });

  it("172.31.0.0", function () {
    const str = "172.31.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([172, 31, 0, 0]);
  });

  it("10.100.0.0", function () {
    const str = "10.100.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([10, 100, 0, 0]);
  });

  it("203.0.123.0", function () {
    const str = "203.0.123.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([203, 0, 123, 0]);
  });

  it("198.18.0.0", function () {
    const str = "198.18.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([198, 18, 0, 0]);
  });

  it("172.19.0.0", function () {
    const str = "172.19.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([172, 19, 0, 0]);
  });

  it("10.50.0.0", function () {
    const str = "10.50.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([10, 50, 0, 0]);
  });

  it("192.168.2.0", function () {
    const str = "192.168.2.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([192, 168, 2, 0]);
  });

  it("172.17.0.0", function () {
    const str = "172.17.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([172, 17, 0, 0]);
  });

  it("10.200.0.0", function () {
    const str = "10.200.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([10, 200, 0, 0]);
  });

  it("192.168.3.0", function () {
    const str = "192.168.3.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(true);
    expect(res.val).toStrictEqual([192, 168, 3, 0]);
  });

  it("10.0.0.0/24", function () {
    const str = "10.0.0.0/24";
    const res = validateIPv4(str);
    expect(res.ok).toBe(false);
    expect(res.val).toStrictEqual({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} should not contain mask part`,
    });
  });

  it("10.0.0..0", function () {
    const str = "10.0.0..0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(false);
    expect(res.val).toStrictEqual({
      kind: "IP_VALIDATION_ERROR",
      msg: `each section in ${str} should be one valid number`,
    });
  });

  it("10.256.0.0", function () {
    const str = "10.256.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(false);
    expect(res.val).toStrictEqual({
      kind: "IP_VALIDATION_ERROR",
      msg: `each part in ${str} should between 0-255`,
    });
  });

  it("10.10.0", function () {
    const str = "10.10.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(false);
    expect(res.val).toStrictEqual({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} should contain 4 parts`,
    });
  });

  it("10.10.0.0.0", function () {
    const str = "10.10.0.0.0";
    const res = validateIPv4(str);
    expect(res.ok).toBe(false);
    expect(res.val).toStrictEqual({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} should contain 4 parts`,
    });
  });

  it("10.10.0.a", function () {
    const str = "10.10.0.a";
    const res = validateIPv4(str);
    expect(res.ok).toBe(false);
    expect(res.val).toStrictEqual({
      kind: "IP_VALIDATION_ERROR",
      msg: `${str} may contain non-numberic character`,
    });
  });
});
