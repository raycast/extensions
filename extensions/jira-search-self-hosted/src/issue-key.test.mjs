import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIssueNumberJql } from "./issue-key.ts";

describe("buildIssueNumberJql", () => {
  it("builds an exact key from a number and one default project", () => {
    assert.equal(buildIssueNumberJql("123", "ACME"), "key=ACME-123");
  });

  it("trims the query and supports multiple unique project keys", () => {
    assert.equal(buildIssueNumberJql(" 123 ", "ACME, DEV, acme"), 'key IN ("ACME-123", "DEV-123")');
  });

  it("ignores default project values that cannot be issue-key prefixes", () => {
    assert.equal(buildIssueNumberJql("123", "My Project, ACME, OPS_TEAM"), "key=ACME-123");
    assert.equal(buildIssueNumberJql("123", "My Project, OPS_TEAM"), undefined);
  });

  it("does not resolve non-numeric searches", () => {
    for (const query of ["", "ACME-123", "123a", "-123", "1.23", "@ACME 123"]) {
      assert.equal(buildIssueNumberJql(query, "ACME"), undefined);
    }
  });

  it("does not resolve a number without a default project key", () => {
    assert.equal(buildIssueNumberJql("123", undefined), undefined);
    assert.equal(buildIssueNumberJql("123", ""), undefined);
  });
});
