import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSenderDisplayName, parseSelectedEmailResult } from "../src/helpers/mail";

describe("Mail Extraction Helpers", () => {
  it("parses valid raw result with subject, message id, and sender", () => {
    const raw = JSON.stringify({
      status: "OK",
      subject: "Project Planning Meeting",
      messageId: "CAB12345@mail.example.com",
      sender: "Alice Smith <alice@example.com>",
    });
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "Project Planning Meeting");
    assert.equal(parsed.messageId, "CAB12345@mail.example.com");
    assert.equal(parsed.sender, "Alice Smith <alice@example.com>");
    assert.equal(parsed.url, "message://%3CCAB12345@mail.example.com%3E");
  });

  it("strips wrapping angle brackets from message id", () => {
    const raw = JSON.stringify({
      status: "OK",
      subject: "Invoice #1024",
      messageId: "<INV-987654@billing.org>",
      sender: "billing@billing.org",
    });
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "Invoice #1024");
    assert.equal(parsed.messageId, "INV-987654@billing.org");
    assert.equal(parsed.url, "message://%3CINV-987654@billing.org%3E");
  });

  it("escapes percent signs in message IDs when constructing URL", () => {
    const raw = JSON.stringify({
      status: "OK",
      subject: "Exchange Update",
      messageId: "<D22041DC.25F53%person@company.com>",
      sender: "person@company.com",
    });
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "Exchange Update");
    assert.equal(parsed.messageId, "D22041DC.25F53%person@company.com");
    assert.equal(parsed.url, "message://%3CD22041DC.25F53%25person@company.com%3E");
  });

  it("handles empty subject cleanly", () => {
    const raw = JSON.stringify({
      status: "OK",
      subject: "   ",
      messageId: "NOMSGID-123@example.com",
      sender: "noreply@example.com",
    });
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "");
    assert.equal(parsed.messageId, "NOMSGID-123@example.com");
    assert.equal(parsed.url, "message://%3CNOMSGID-123@example.com%3E");
  });

  it("handles subjects with arbitrary special characters, quotes, and separator-like strings without corruption", () => {
    const raw = JSON.stringify({
      status: "OK",
      subject: 'Special "Subject" with ---RAYCAST_MAIL_SEPARATOR--- & { json: "test" }',
      messageId: "SECURE-100@domain.org",
      sender: "security@domain.org",
    });
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, 'Special "Subject" with ---RAYCAST_MAIL_SEPARATOR--- & { json: "test" }');
    assert.equal(parsed.messageId, "SECURE-100@domain.org");
    assert.equal(parsed.url, "message://%3CSECURE-100@domain.org%3E");
  });

  it("returns null when Mail is not running or no selection exists", () => {
    assert.equal(parseSelectedEmailResult(JSON.stringify({ status: "MAIL_NOT_RUNNING" })), null);
    assert.equal(parseSelectedEmailResult(JSON.stringify({ status: "NO_SELECTION" })), null);
    assert.equal(parseSelectedEmailResult(undefined), null);
    assert.equal(parseSelectedEmailResult(""), null);
  });

  it("returns null when message id is empty or invalid JSON", () => {
    assert.equal(parseSelectedEmailResult("Invalid text not JSON"), null);
    assert.equal(parseSelectedEmailResult(JSON.stringify({ status: "OK", subject: "Test", messageId: "" })), null);
    assert.equal(parseSelectedEmailResult(JSON.stringify({ status: "OK", subject: "Test", messageId: "<>" })), null);
  });

  it("extracts clean sender display name without email address", () => {
    assert.equal(getSenderDisplayName("Bosch Group <notification@smartrecruiters.com>"), "Bosch Group");
    assert.equal(getSenderDisplayName('"Bosch Group" <notification@smartrecruiters.com>'), "Bosch Group");
    assert.equal(getSenderDisplayName("Alice Smith <alice@example.com>"), "Alice Smith");
    assert.equal(getSenderDisplayName("<support@apple.com>"), "support@apple.com");
    assert.equal(getSenderDisplayName("support@apple.com"), "support@apple.com");
    assert.equal(getSenderDisplayName(""), "");
    assert.equal(getSenderDisplayName(undefined), "");
  });
});
