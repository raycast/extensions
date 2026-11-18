import test from "node:test";
import assert from "node:assert/strict";
import {
  fieldsOf,
  formatAddress,
  formatExpirationDate,
  formatFieldDate,
  formatWifiSecurity,
  lastDigitsOf,
} from "./item-fields";

test("writes a card's expiration date as on the card", () => {
  assert.equal(formatExpirationDate("2027-12"), "12/27");
  assert.equal(formatExpirationDate("2030-3"), "03/30");
  assert.equal(formatExpirationDate("12/27"), "12/27");
});

test("keeps the last 4 digits of a card number only when it has them", () => {
  assert.equal(lastDigitsOf("4242 4242 4242 1234"), "1234");
  assert.equal(lastDigitsOf("12"), undefined);
});

test("writes an identity's address on one line, with the postal code before the city", () => {
  assert.equal(
    formatAddress({
      streetAddress: "12 Example Street",
      zipOrPostalCode: "75000",
      city: "Paris",
      countryOrRegion: "France",
    }),
    "12 Example Street, 75000 Paris, France",
  );
  assert.equal(formatAddress({ city: "Paris" }), "Paris");
  assert.equal(formatAddress({ fullName: "Jean Example" }), undefined);
});

test("leaves out a Wi-Fi network's security when it wasn't set", () => {
  assert.equal(formatWifiSecurity("WPA2"), "WPA2");
  assert.equal(formatWifiSecurity("UnspecifiedWifiSecurity"), undefined);
});

test("shows a date field's day in UTC", () => {
  assert.equal(formatFieldDate(Date.UTC(2026, 5, 14) / 1000), "Jun 14, 2026");
});

test("gives every type's fields distinct IDs, apart from the rows every item has", () => {
  const shared = ["username", "email", "password", "totp", "website", "note", "vault", "folder", "type", "modified"];
  const ids = (["credit_card", "identity", "alias", "ssh_key", "wifi"] as const).flatMap((type) =>
    fieldsOf(type).map((spec) => spec.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    ids.filter((id) => shared.includes(id)),
    [],
  );
  assert.deepEqual(fieldsOf("login"), []);
  assert.deepEqual(fieldsOf("custom"), []);
});
