import { describe, expect, it } from "vitest";
import { formatAddress, formatPercent, formatUsd, tokenHeaderMarkdown, tokenLabels } from "./format";

describe("formatUsd", () => {
  it("returns an em dash for undefined", () => {
    expect(formatUsd(undefined)).toBe("—");
  });

  it("returns an em dash for NaN", () => {
    expect(formatUsd(NaN)).toBe("—");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("uses compact notation for millions", () => {
    expect(formatUsd(42_100_000)).toBe("$42.1M");
  });

  it("uses compact notation for billions", () => {
    expect(formatUsd(4_700_000_000)).toBe("$4.7B");
  });

  it("uses compact notation for thousands without a trailing .0", () => {
    expect(formatUsd(310_000)).toBe("$310K");
  });

  it("formats sub-thousand values with two decimals", () => {
    expect(formatUsd(999.99)).toBe("$999.99");
    expect(formatUsd(1.5)).toBe("$1.50");
  });

  it("keeps three significant digits for tiny prices", () => {
    expect(formatUsd(0.0000112)).toBe("$0.0₄112");
    expect(formatUsd(4.75211842279e-6)).toBe("$0.0₅4752");
    expect(formatUsd(3.14146622291e-9)).toBe("$0.0₈3141");
    expect(formatUsd(0.000123)).toBe("$0.000123");
    expect(formatUsd(0.0000099999)).toBe("$0.0₄1");
  });

  it("keeps three significant digits for prices just under $1", () => {
    expect(formatUsd(0.1234)).toBe("$0.123");
  });

  it("formats negative values with a leading minus sign", () => {
    expect(formatUsd(-42_100_000)).toBe("-$42.1M");
    expect(formatUsd(-1.5)).toBe("-$1.50");
    expect(formatUsd(-0.0000112)).toBe("-$0.0₄112");
  });
});

describe("formatPercent", () => {
  it("shows changes that round to zero without a sign", () => {
    expect(formatPercent(-0.0001)).toBe("0.0%");
    expect(formatPercent(0.0004)).toBe("0.0%");
    expect(formatPercent(-0.0006)).toBe("-0.1%");
  });

  it("returns an em dash for undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });

  it("returns an em dash for NaN", () => {
    expect(formatPercent(NaN)).toBe("—");
  });

  it("formats a positive fraction with a leading plus sign", () => {
    expect(formatPercent(0.04)).toBe("+4.0%");
  });

  it("formats a negative fraction with a leading minus sign", () => {
    expect(formatPercent(-0.082)).toBe("-8.2%");
  });

  it("formats zero as 0.0%", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatAddress", () => {
  it("returns an em dash for undefined", () => {
    expect(formatAddress(undefined)).toBe("—");
  });

  it("returns an em dash for an empty string", () => {
    expect(formatAddress("")).toBe("—");
  });

  it("truncates a long address to a leading and trailing chunk", () => {
    expect(formatAddress("0x69820D8f0ab9f9Ed19331111111111111933")).toBe("0x6982…1933");
  });

  it("returns short strings unchanged", () => {
    expect(formatAddress("0x1234")).toBe("0x1234");
  });
});

describe("tokenHeaderMarkdown", () => {
  const token = {
    name: "Pons",
    symbol: "PONS",
    networkName: "Robinhood",
    address: "0x39dbed3a2bd333467115de45665cc57f813c4571",
  };

  it("sizes the logo, appending to an existing query string", () => {
    expect(tokenHeaderMarkdown({ ...token, imageUrl: "https://img/p.png" })).toContain(
      "![](https://img/p.png?raycast-width=56&raycast-height=56)",
    );
    expect(tokenHeaderMarkdown({ ...token, imageUrl: "https://img/p.png?v=2" })).toContain(
      "p.png?v=2&raycast-width=56",
    );
  });

  it("keeps a hostile image URL inside one image and drops non-https URLs", () => {
    const md = tokenHeaderMarkdown({ ...token, imageUrl: "https://img.invalid/a)\n\n[Open](https://evil.invalid/x" });
    expect(md).not.toContain("[Open](");
    expect(md.split("\n")[0]).toMatch(/^!\[\]\(https:\/\/img\.invalid\/a%29[^()\s]*\)$/);
    expect(tokenHeaderMarkdown({ ...token, imageUrl: "file:///etc/passwd" })).not.toContain("![]");
    expect(tokenHeaderMarkdown({ ...token, imageUrl: "not a url" })).not.toContain("![]");
  });

  it("omits the image when there is none and escapes Markdown in names", () => {
    const md = tokenHeaderMarkdown({ ...token, name: "*Evil* _Coin_", symbol: "EV#L", networkName: "Solana" });
    expect(md).not.toContain("![]");
    expect(md).toContain("## \\*Evil\\* \\_Coin\\_");
    expect(md).toContain("**EV\\#L** on Solana · `0x39db…4571`");
  });
});

describe("tokenLabels", () => {
  const address = "0x39dbed3a2bd333467115de45665cc57f813c4571";

  it("falls back to the name, then the short address, when fields are missing", () => {
    expect(tokenLabels({ name: "Pons", symbol: "PONS", address })).toEqual({ title: "PONS", subtitle: "Pons" });
    expect(tokenLabels({ name: "Pons", symbol: "", address })).toEqual({ title: "Pons", subtitle: "0x39db…4571" });
    expect(tokenLabels({ name: "", symbol: "", address })).toEqual({ title: "0x39db…4571", subtitle: "" });
  });

  it("gives the detail header a heading when name and symbol are empty", () => {
    const md = tokenHeaderMarkdown({ name: "", symbol: "", networkName: "Base", address });
    expect(md).toContain("## 0x39db…4571");
    expect(md).toContain("On Base · `0x39db…4571`");
  });
});
