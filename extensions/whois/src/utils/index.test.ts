import { describe, expect, it } from "vitest";
import { parseDomain } from "./index";

describe("parseDomain", () => {
  it("correctly identifies an IPv4 address", () => {
    const result = parseDomain("8.8.8.8");
    expect(result.isIp).toBe(true);
    expect(result.isDomain).toBe(false);
    expect(result.input).toBe("8.8.8.8");
  });

  it("correctly identifies a standard domain", () => {
    const result = parseDomain("raycast.com");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(true);
    expect(result.input).toBe("raycast.com");
  });

  it("correctly extracts base domain from standard subdomains", () => {
    const result = parseDomain("docs.raycast.com");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(true);
    expect(result.input).toBe("raycast.com");

    const result2 = parseDomain("dash.cloudflare.com");
    expect(result2.isIp).toBe(false);
    expect(result2.isDomain).toBe(true);
    expect(result2.input).toBe("cloudflare.com");

    const result3 = parseDomain("deep.nested.subdomain.example.org");
    expect(result3.isIp).toBe(false);
    expect(result3.isDomain).toBe(true);
    expect(result3.input).toBe("example.org");
  });

  it("handles empty strings", () => {
    const result = parseDomain("");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(false);
    expect(result.input).toBe("");
  });

  it("returns false for invalid inputs", () => {
    const result = parseDomain("not-a-domain-or-ip");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(false);
    expect(result.input).toBe("not-a-domain-or-ip");
  });

  it("sanitizes URLs with protocols, paths, and extracts base domain", () => {
    const result = parseDomain("https://ardehtulum.com/");
    expect(result.isIp).toBe(false);
    expect(result.isDomain).toBe(true);
    expect(result.input).toBe("ardehtulum.com");

    const result2 = parseDomain("http://www.dash.cloudflare.com/path/to/page?query=string#hash");
    expect(result2.isIp).toBe(false);
    expect(result2.isDomain).toBe(true);
    expect(result2.input).toBe("cloudflare.com");

    const result3 = parseDomain("https://1.1.1.1/some/path");
    expect(result3.isIp).toBe(true);
    expect(result3.isDomain).toBe(false);
    expect(result3.input).toBe("1.1.1.1");
  });

  it("correctly handles complex ccTLD subdomains", () => {
    const result1 = parseDomain("subdomain.example.co.uk");
    expect(result1.input).toBe("example.co.uk");

    const result2 = parseDomain("sub.example.com.mx");
    expect(result2.input).toBe("example.com.mx");

    const result3 = parseDomain("gov.uk");
    expect(result3.input).toBe("gov.uk");

    const result4 = parseDomain("another.sub.example.edu.co");
    expect(result4.input).toBe("example.edu.co");

    // UK cases
    expect(parseDomain("sub.example.ltd.uk").input).toBe("example.ltd.uk");
    expect(parseDomain("nested.sub.example.plc.uk").input).toBe("example.plc.uk");
    expect(parseDomain("sub.example.sch.uk").input).toBe("example.sch.uk");
    expect(parseDomain("my.personal.blog.me.uk").input).toBe("blog.me.uk");

    // Brazil cases
    expect(parseDomain("sub.empresa.com.br").input).toBe("empresa.com.br");
    expect(parseDomain("sub.advogado.adv.br").input).toBe("advogado.adv.br");
    expect(parseDomain("canal.canal.tv.br").input).toBe("canal.tv.br");
    expect(parseDomain("sub.projeto.org.br").input).toBe("projeto.org.br");

    // Japan cases
    expect(parseDomain("sub.company.co.jp").input).toBe("company.co.jp");
    expect(parseDomain("sub.network.ne.jp").input).toBe("network.ne.jp");
    expect(parseDomain("sub.school.ed.jp").input).toBe("school.ed.jp");

    // South Africa cases
    expect(parseDomain("sub.company.co.za").input).toBe("company.co.za");
    expect(parseDomain("sub.firm.law.za").input).toBe("firm.law.za");
    expect(parseDomain("sub.school.school.za").input).toBe("school.school.za");

    // Australia cases
    expect(parseDomain("sub.company.com.au").input).toBe("company.com.au");
    expect(parseDomain("sub.association.asn.au").input).toBe("association.asn.au");
    expect(parseDomain("sub.person.id.au").input).toBe("person.id.au");
    // Direct au domain (should keep 2 parts)
    expect(parseDomain("sub.company.au").input).toBe("company.au");

    // US cases
    expect(parseDomain("sub.agency.gov.us").input).toBe("agency.gov.us");
    expect(parseDomain("sub.school.edu.us").input).toBe("school.edu.us");

    // CA cases
    expect(parseDomain("sub.government.gc.ca").input).toBe("government.gc.ca");
    expect(parseDomain("sub.site.on.ca").input).toBe("site.on.ca");

    // PL cases
    expect(parseDomain("sub.company.com.pl").input).toBe("company.com.pl");
    expect(parseDomain("sub.city.waw.pl").input).toBe("city.waw.pl");
  });

  it("leaves IP addresses intact", () => {
    const result1 = parseDomain("192.168.1.1");
    expect(result1.isIp).toBe(true);
    expect(result1.input).toBe("192.168.1.1");

    const result2 = parseDomain("2606:4700:4700::1111");
    expect(result2.input).toBe("2606:4700:4700::1111");
  });

  it("does not truncate standard non-ccTLD domains with matching words", () => {
    // google is not 2 letters, so google.com is resolved as example.com (google.com)
    expect(parseDomain("sub.google.com").input).toBe("google.com");
    // nic is not in commonSecondLevels, so sub.nic.google becomes nic.google
    expect(parseDomain("sub.nic.google").input).toBe("nic.google");

    // Test cases for false triggers on two-letter TLDs that are not registered for those second levels
    expect(parseDomain("sub.blog.io").input).toBe("blog.io");
    expect(parseDomain("sub.id.me").input).toBe("id.me");
    expect(parseDomain("sub.art.is").input).toBe("art.is");
    expect(parseDomain("sub.tv.li").input).toBe("tv.li");
  });
});
