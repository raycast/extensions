import { describe, expect, it } from "vitest";
import { mergeHosts } from "../src/lib/mergeHosts";

describe("mergeHosts", () => {
  it("orders recent → managed → config, dedup keeps first occurrence", () => {
    const out = mergeHosts(
      ["ect"],
      ["mm", "ect"],
      ["server.example.com", "mm"],
    );
    expect(out).toEqual([
      { name: "ect", source: "recent" },
      { name: "mm", source: "managed" },
      { name: "server.example.com", source: "config" },
    ]);
  });
  it("drops empty names", () => {
    expect(mergeHosts([""], [], [])).toEqual([]);
  });
  it("filters invalid hosts from every source (spec §7: all ingress paths)", () => {
    expect(mergeHosts(["-bad"], ["a b"], ["ok", "!neg"])).toEqual([
      { name: "ok", source: "config" },
    ]);
  });
  it("excludes hosts not present in any source (F1 whitelist: deeplink to unknown host is rejected)", () => {
    const known = mergeHosts(["ect"], ["mm"], ["server.example.com"]);
    // isKnownHost는 이 목록 멤버십으로 판정 — 조작 딥링크의 임의 host는 여기에 없어 차단된다
    expect(known.some((e) => e.name === "attacker.example.com")).toBe(false);
    expect(known.some((e) => e.name === "mm")).toBe(true);
  });
});
