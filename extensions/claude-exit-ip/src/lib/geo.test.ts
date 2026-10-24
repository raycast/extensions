import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseGeo } from "./geo";

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL("./__fixtures__/" + name, import.meta.url)), "utf8");

describe("parseGeo", () => {
  it("parses the fields-trimmed successful body without a success key", () => {
    expect(parseGeo(JSON.parse(fixture("geo-ok.json")))).toEqual({
      kind: "ok",
      country: "United States",
      countryCode: "US",
      city: "San Jose",
      isp: "Oracle Corporation",
      asn: 31898,
    });
  });

  it("rejects a 200 failure body using the explicit false guard", () => {
    expect(parseGeo(JSON.parse(fixture("geo-reserved.json"))).kind).toBe("failed");
  });

  it("omits an empty ISP segment while retaining ASN", () => {
    expect(parseGeo(JSON.parse(fixture("geo-no-isp.json")))).toEqual({
      kind: "ok",
      country: "United States",
      countryCode: "US",
      city: "San Jose",
      asn: 31898,
    });
  });
});
