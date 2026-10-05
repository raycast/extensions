import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NamecheapApiError,
  parseApiResponse,
  parseDomainCheck,
  parseDomainList,
  parseNamecheapDate,
  parsePricing,
} from "../src/namecheap/parse";
import { createClient } from "../src/namecheap/client";

const GET_LIST = `<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse xmlns="http://api.namecheap.com/xml.response" Status="OK">
  <Errors />
  <RequestedCommand>namecheap.domains.getList</RequestedCommand>
  <CommandResponse Type="namecheap.domains.getList">
    <DomainGetListResult>
      <Domain ID="127" Name="domain1.com" User="owner" Created="02/15/2016" Expires="02/15/2022" IsExpired="false" IsLocked="false" AutoRenew="false" WhoisGuard="ENABLED" IsPremium="true" IsOurDNS="true"/>
      <Domain ID="381" Name="domain2.com" User="owner" Created="04/28/2016" Expires="04/28/2023" IsExpired="false" IsLocked="false" AutoRenew="true" WhoisGuard="NOTPRESENT" IsPremium="false" IsOurDNS="true"/>
    </DomainGetListResult>
    <Paging>
      <TotalItems>2</TotalItems>
      <CurrentPage>1</CurrentPage>
      <PageSize>10</PageSize>
    </Paging>
  </CommandResponse>
  <Server>SERVER-NAME</Server>
  <GMTTimeDifference>+5</GMTTimeDifference>
  <ExecutionTime>0.078</ExecutionTime>
</ApiResponse>`;

const GET_LIST_SINGLE = GET_LIST.replace(/<Domain ID="381"[^>]*\/>\n/, "");
const GET_LIST_EMPTY = GET_LIST.replace(/<DomainGetListResult>[\s\S]*<\/DomainGetListResult>/, "<DomainGetListResult />").replace(
  "<TotalItems>2</TotalItems>",
  "<TotalItems>0</TotalItems>",
);

const CHECK = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse xmlns="http://api.namecheap.com/xml.response" Status="OK">
<Errors/>
<Warnings/>
<RequestedCommand>namecheap.domains.check</RequestedCommand>
<CommandResponse Type="namecheap.domains.check">
<DomainCheckResult Domain="testapi.xyz" Available="false" ErrorNo="0" Description="" IsPremiumName="false" PremiumRegistrationPrice="0" PremiumRenewalPrice="0" PremiumRestorePrice="0" PremiumTransferPrice="0" IcannFee="0" EapFee="0"/>
<DomainCheckResult Domain="US.xyz" Available="true" ErrorNo="0" Description="" IsPremiumName="true" PremiumRegistrationPrice="13000.0000" PremiumRenewalPrice="13000.0000" PremiumRestorePrice="65.0000" PremiumTransferPrice="13000.0000" IcannFee="0.1800" EapFee="0.0000"/>
<DomainCheckResult Domain="nope.invalidtld" Available="false" ErrorNo="2030280" Description="TLD is not supported in API" IsPremiumName="false" PremiumRegistrationPrice="0" PremiumRenewalPrice="0" PremiumRestorePrice="0" PremiumTransferPrice="0" IcannFee="0" EapFee="0"/>
</CommandResponse>
<Server>PHX01APIEXT02</Server>
<GMTTimeDifference>--4:00</GMTTimeDifference>
<ExecutionTime>1.358</ExecutionTime>
</ApiResponse>`;

const PRICING = `<?xml version="1.0" encoding="UTF-8"?>
<ApiResponse xmlns="http://api.namecheap.com/xml.response" Status="OK">
  <Errors />
  <RequestedCommand>namecheap.users.getPricing</RequestedCommand>
  <CommandResponse Type="namecheap.users.getPricing">
    <UserGetPricingResult>
      <ProductType Name="DOMAIN">
        <ProductCategory Name="REACTIVATE">
          <Product Name="biz">
            <Price Duration="1" DurationType="YEAR" Price="8.55" RegularPrice="8.55" YourPrice="8.55" CouponPrice="" Currency="USD" />
          </Product>
        </ProductCategory>
        <ProductCategory Name="REGISTER">
          <Product Name="biz">
            <Price Duration="1" DurationType="YEAR" Price="6.00" RegularPrice="8.87" YourPrice="6.00" CouponPrice="" Currency="USD" />
            <Price Duration="2" DurationType="YEAR" Price="8.87" RegularPrice="8.87" YourPrice="8.87" CouponPrice="" Currency="USD" />
          </Product>
          <Product Name="co.uk">
            <Price Duration="1" DurationType="YEAR" Price="" RegularPrice="9.98" YourPrice="7.50" CouponPrice="" Currency="USD" />
          </Product>
        </ProductCategory>
      </ProductType>
    </UserGetPricingResult>
  </CommandResponse>
  <Server>IMWS-A06</Server>
  <GMTTimeDifference>+5:30</GMTTimeDifference>
  <ExecutionTime>1.109</ExecutionTime>
</ApiResponse>`;

const ERROR = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse Status="ERROR" xmlns="http://api.namecheap.com/xml.response">
  <Errors>
    <Error Number="1011150">Parameter RequestIP is invalid</Error>
  </Errors>
  <Warnings />
  <RequestedCommand />
  <Server>PHX01APIEXT01</Server>
  <GMTTimeDifference>--4:00</GMTTimeDifference>
  <ExecutionTime>0.003</ExecutionTime>
</ApiResponse>`;

describe("parseNamecheapDate", () => {
  it("converts MM/DD/YYYY to ISO", () => assert.equal(parseNamecheapDate("02/15/2022"), "2022-02-15"));
  it("pads single digits", () => assert.equal(parseNamecheapDate("2/5/2022"), "2022-02-05"));
  it("returns null for garbage", () => {
    assert.equal(parseNamecheapDate(""), null);
    assert.equal(parseNamecheapDate("2022-02-15"), null);
    assert.equal(parseNamecheapDate("13/40/2022"), null);
  });
});

describe("parseApiResponse", () => {
  it("throws a NamecheapApiError with number, message and hint on Status=ERROR", () => {
    assert.throws(
      () => parseApiResponse(ERROR),
      (error: unknown) => {
        assert.ok(error instanceof NamecheapApiError);
        assert.equal(error.number, "1011150");
        assert.equal(error.message, "Parameter RequestIP is invalid");
        assert.match(error.hint ?? "", /whitelist/i);
        return true;
      },
    );
  });
  it("rejects non-XML", () => assert.throws(() => parseApiResponse("<html>oops"), /not valid XML|unexpected/i));
  it("strips the Type attribute from the body", () => {
    const body = parseApiResponse(CHECK);
    assert.equal("Type" in body, false);
    assert.ok(Array.isArray(body.DomainCheckResult));
  });
});

describe("parseDomainList", () => {
  it("maps domains and paging", () => {
    const page = parseDomainList(parseApiResponse(GET_LIST));
    assert.equal(page.totalItems, 2);
    assert.equal(page.currentPage, 1);
    assert.equal(page.domains.length, 2);
    assert.deepEqual(page.domains[0], {
      id: "127",
      name: "domain1.com",
      user: "owner",
      created: "2016-02-15",
      expires: "2022-02-15",
      isExpired: false,
      isLocked: false,
      autoRenew: false,
      whoisGuard: "ENABLED",
      isPremium: true,
      isOurDns: true,
    });
    assert.equal(page.domains[1].autoRenew, true);
  });
  it("handles a single domain and an empty list", () => {
    assert.equal(parseDomainList(parseApiResponse(GET_LIST_SINGLE)).domains.length, 1);
    const empty = parseDomainList(parseApiResponse(GET_LIST_EMPTY));
    assert.deepEqual(empty.domains, []);
    assert.equal(empty.totalItems, 0);
  });
});

describe("parseDomainCheck", () => {
  it("maps regular, premium and errored results", () => {
    const [regular, premium, errored] = parseDomainCheck(parseApiResponse(CHECK));
    assert.deepEqual(
      { domain: regular.domain, available: regular.available, errorNo: regular.errorNo },
      { domain: "testapi.xyz", available: false, errorNo: 0 },
    );
    assert.equal(premium.domain, "us.xyz");
    assert.equal(premium.available, true);
    assert.equal(premium.isPremium, true);
    assert.equal(premium.premiumRegistrationPrice, 13000);
    assert.equal(premium.icannFee, 0.18);
    assert.equal(errored.errorNo, 2030280);
    assert.equal(errored.description, "TLD is not supported in API");
  });
});

describe("parsePricing", () => {
  it("keeps only the REGISTER category and indexes by TLD and years", () => {
    const table = parsePricing(parseApiResponse(PRICING));
    assert.deepEqual(Object.keys(table).sort(), ["biz", "co.uk"]);
    assert.equal(table.biz.byYears[1], 6);
    assert.equal(table.biz.byYears[2], 8.87);
    assert.equal(table.biz.regularByYears[1], 8.87);
    assert.equal(table.biz.currency, "USD");
  });
  it("falls back to YourPrice when Price is empty", () => {
    const table = parsePricing(parseApiResponse(PRICING));
    assert.equal(table["co.uk"].byYears[1], 7.5);
  });
});

describe("createClient", () => {
  const config = { apiUser: "ncuser", apiKey: "secret", clientIp: "203.0.113.10", sandbox: true };

  it("sends the global parameters and the command in a POST body", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(CHECK, { status: 200 });
    }) as typeof fetch;
    const client = createClient(config, fetchImpl);
    const results = await client.checkDomains(["Testapi.xyz", "us.xyz", "nope.invalidtld"]);

    assert.equal(calls[0].url, "https://api.sandbox.namecheap.com/xml.response");
    assert.equal(calls[0].init?.method, "POST");
    const body = new URLSearchParams(String(calls[0].init?.body));
    assert.equal(body.get("ApiUser"), "ncuser");
    assert.equal(body.get("UserName"), "ncuser");
    assert.equal(body.get("ClientIp"), "203.0.113.10");
    assert.equal(body.get("Command"), "namecheap.domains.check");
    assert.equal(body.get("DomainList"), "testapi.xyz,us.xyz,nope.invalidtld");
    assert.deepEqual(
      results.map((result) => result.domain),
      ["testapi.xyz", "us.xyz", "nope.invalidtld"],
    );
  });

  it("never puts the API key in the URL, where proxies and CDNs would log it", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(CHECK, { status: 200 });
    }) as typeof fetch;
    const client = createClient({ ...config, apiKey: "SUPERSECRETKEY" }, fetchImpl);
    await client.checkDomains(["acme.com"]);
    await client.getRegisterPricing().catch(() => undefined);
    assert.ok(urls.length > 0);
    for (const url of urls) {
      assert.doesNotMatch(url, /SUPERSECRETKEY/);
      assert.doesNotMatch(url, /ApiKey/i);
      assert.equal(url.includes("?"), false);
    }
  });

  it("chunks availability checks by 50", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response(CHECK, { status: 200 });
    }) as typeof fetch;
    const client = createClient(config, fetchImpl);
    const domains = Array.from({ length: 51 }, (_, index) => `d${index}.com`);
    const results = await client.checkDomains(domains);
    assert.equal(calls, 2);
    assert.equal(results.length, 51);
    assert.equal(results[10].errorNo, -1);
  });

  it("walks every page of domains.getList", async () => {
    const pages: string[] = [];
    const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
      const page = new URLSearchParams(String(init?.body)).get("Page") ?? "1";
      pages.push(page);
      const xml =
        page === "1"
          ? GET_LIST_SINGLE.replace("<TotalItems>2</TotalItems>", "<TotalItems>2</TotalItems>")
          : GET_LIST_SINGLE.replace('ID="127" Name="domain1.com"', 'ID="999" Name="domain9.com"');
      return new Response(xml, { status: 200 });
    }) as typeof fetch;
    const client = createClient(config, fetchImpl);
    const domains = await client.listAllDomains();
    assert.deepEqual(pages, ["1", "2"]);
    assert.deepEqual(
      domains.map((domain) => domain.name),
      ["domain1.com", "domain9.com"],
    );
  });

  it("surfaces API errors", async () => {
    const fetchImpl = (async () => new Response(ERROR, { status: 200 })) as typeof fetch;
    const client = createClient(config, fetchImpl);
    await assert.rejects(client.listDomains(), NamecheapApiError);
  });

  it("surfaces HTTP errors without an XML body", async () => {
    const fetchImpl = (async () => new Response("Bad Gateway", { status: 502 })) as typeof fetch;
    const client = createClient(config, fetchImpl);
    await assert.rejects(client.listDomains(), /HTTP 502/);
  });
});
