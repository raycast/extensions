import { describe, expect, it } from "vitest";
import { avatarRadii, companyAvatar } from "../src/lib/brand";

describe("avatarRadii", () => {
  it("sizes each dot by its digit", () => {
    expect(avatarRadii("923609016")).toEqual(
      [6.55, 3.4, 3.85, 5.2, 2.5, 6.55, 2.5, 2.95, 5.2].map((r) => expect.closeTo(r)),
    );
  });
});

describe("companyAvatar", () => {
  it("returns a light and dark SVG for a valid org number", () => {
    const avatar = companyAvatar("923609016") as { source: { light: string; dark: string } };
    expect(avatar.source.light).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(Buffer.from(avatar.source.light.split(",")[1], "base64").toString()).toContain('fill="#4f43b5"');
    expect(Buffer.from(avatar.source.dark.split(",")[1], "base64").toString()).toContain('fill="#ab9ff2"');
  });

  it("returns undefined for foreign or missing ids", () => {
    expect(companyAvatar(null)).toBeUndefined();
    expect(companyAvatar("1234")).toBeUndefined();
  });
});
