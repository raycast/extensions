import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseApiResponse, parsePricing } from "../src/namecheap/parse";

/**
 * Verbatim from Namecheap's own Go SDK fixture (namecheaptest/fixtures/users_getPricing.xml), which is a
 * captured live response. It differs from the documentation example in two ways that both broke this parser:
 * the product type is "domains" rather than "DOMAIN", and rows carry Price="0.0" or Price="" while the real
 * figure sits in YourPrice or RegularPrice.
 */
const LIVE_PRICING = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse Status="OK" xmlns="http://api.namecheap.com/xml.response">
  <Errors />
  <RequestedCommand>namecheap.users.getpricing</RequestedCommand>
  <CommandResponse Type="namecheap.users.getPricing">
    <UserGetPricingResult>
      <ProductType Name="domains">
        <ProductCategory Name="register">
          <Product Name="com">
            <Price Duration="1" DurationType="YEAR" Price="0.0" RegularPrice="12.00" YourPrice="10.50" Currency="USD" />
          </Product>
          <Product Name="net">
            <Price Duration="1" DurationType="YEAR" Price="" RegularPrice="9.18" YourPrice="0.00" Currency="USD" />
          </Product>
          <Product Name="org">
            <Price Duration="1" DurationType="YEAR" Price="8.88" RegularPrice="11.00" YourPrice="8.88" Currency="USD" />
          </Product>
        </ProductCategory>
        <ProductCategory Name="renew">
          <Product Name="com">
            <Price Duration="1" DurationType="YEAR" Price="13.00" RegularPrice="13.00" YourPrice="13.00" Currency="USD" />
          </Product>
        </ProductCategory>
      </ProductType>
    </UserGetPricingResult>
  </CommandResponse>
</ApiResponse>`;

describe("pricing, against a captured live response", () => {
  const table = parsePricing(parseApiResponse(LIVE_PRICING));

  it('reads a product type named "domains", not just the documented "DOMAIN"', () => {
    assert.deepEqual(Object.keys(table).sort(), ["com", "net", "org"]);
  });

  it("never quotes a domain at zero when a real figure is available", () => {
    for (const [tld, entry] of Object.entries(table)) {
      assert.ok(entry.byYears[1] > 0, `${tld} was quoted at ${entry.byYears[1]}`);
    }
  });

  it('prefers YourPrice when Price is "0.0"', () => {
    assert.equal(table.com.byYears[1], 10.5);
  });

  it('falls through to RegularPrice when Price and YourPrice are both empty or zero', () => {
    assert.equal(table.net.byYears[1], 9.18);
  });

  it("uses Price when it is a real figure", () => {
    assert.equal(table.org.byYears[1], 8.88);
    assert.equal(table.org.regularByYears[1], 11);
  });

  it("keeps the renew category out of registration pricing", () => {
    assert.equal(table.com.byYears[1], 10.5);
  });
});
