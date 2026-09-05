import { describe, expect, it } from "vitest";
import { detectDeterministic } from "./deterministic";

/** Technical identifiers must survive masking: they are what makes a masked
 * ticket still usable for debugging and database queries. */
function masked(text: string): string[] {
  return detectDeterministic(text).map((s) => text.slice(s.start, s.end));
}

const CASES: Array<[string, string]> = [
  ["UUID v4", "user_id: 550e8400-e29b-41d4-a716-446655440000"],
  ["UUID uppercase", "REF 550E8400-E29B-41D4-A716-446655440000"],
  ["Mongo ObjectId", "doc 507f1f77bcf86cd799439011"],
  ["ULID", "id 01ARZ3NDEKTSV4RRFFQ69G5FAV"],
  ["nanoid", "token V1StGXR8_Z5jdHi6B-myT"],
  ["prefixed customer id", "customer cus_NffrFeUfNV2Hib"],
  ["prefixed org id", "org_2NNEqL2nrIRdJ194ndJqAHwEfxC"],
  ["prefixed user id", "usr_01H8XGJWBWBAQ4ZG7HPQ2M4KDN"],
  ["numeric user id", "user_id=123456782"],
  ["numeric company id", "company_id: 123456782"],
  ["order number", "commande 2024-00184722"],
  ["ticket ref", "ticket #4821"],
  ["epoch milliseconds", "ts 1735689600000"],
  // Luhn is one check digit, so roughly one number in ten satisfies it by
  // chance. This timestamp does, five milliseconds after one that does not.
  ["epoch milliseconds that satisfy Luhn", "ts 1735689600005"],
  ["order number that satisfies Luhn", "commande 1234567890123452"],
  ["git sha", "commit 9f2a1c4e8b7d3f6a0c5e2b8d4f7a1c3e6b9d0f2a"],
  ["semver", "version 1.104.24"],
  ["loopback with port", "listening on 127.0.0.1:5002"],
  ["loopback v6", "bound to ::1"],
  ["link-local", "self-assigned 169.254.12.7"],
  ["unspecified", "bind 0.0.0.0:3000"],
  ["k8s pod", "pod api-worker-7d9f8b6c5d-x4k2p"],
  ["stripe-like object id", "charge ch_3OqLKJ2eZvKYlo2C1gFJqXyZ"],
  ["long numeric id", "external_id 9007199254740991"],
  ["hex id with dashes", "trace 4bf92f35-77b3-4da6-a3ce-929d0e0e4736"],
];

describe("technical identifiers pass through", () => {
  for (const [name, text] of CASES) {
    it(`leaves a ${name} alone`, () => {
      expect(masked(text)).toEqual([]);
    });
  }
});
