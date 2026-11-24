import { test } from "node:test";
import assert from "node:assert/strict";
import { customerEmail, customerName } from "../src/lib/customer-identity";
import { ExplorerClient, type Customer } from "../src/lib/explorer-api";
const customer: Customer = { id: "opaque-id", first_seen_at: 0, last_seen_at: null };
test("customer identity uses recorded name, then email, then ID; never invents an email", () => {
  assert.equal(customerEmail(customer), undefined);
  assert.equal(customerName(customer), "opaque-id");
  const withEmail = {
    ...customer,
    attributes: { items: [{ name: "$email", value: " alex@example.com " }], next_page: null },
  };
  assert.equal(customerEmail(withEmail), "alex@example.com");
  assert.equal(customerName(withEmail), "alex@example.com");
  const withName = {
    ...withEmail,
    attributes: {
      ...withEmail.attributes,
      items: [...withEmail.attributes.items, { name: "$displayName", value: "Alex" }],
    },
  };
  assert.equal(customerName(withName), "Alex");
  assert.equal(customerEmail(withName), "alex@example.com");
  assert.equal(
    customerEmail({ ...customer, attributes: { items: [{ name: "$email", value: "  " }], next_page: null } }),
    undefined,
  );
});
test("customer detail requests expanded attributes and preserves the email", async () => {
  const client = new ExplorerClient("test", (async (url) => {
    const request = new URL(String(url));
    assert.equal(request.pathname, "/v2/projects/project/customers/user%2Fid");
    assert.equal(request.searchParams.get("expand"), "attributes");
    return Response.json({
      ...customer,
      attributes: { items: [{ name: "$email", value: "alex@example.com" }], next_page: null },
    });
  }) as typeof fetch);
  assert.equal(customerEmail(await client.customer("project", "user/id")), "alex@example.com");
});
