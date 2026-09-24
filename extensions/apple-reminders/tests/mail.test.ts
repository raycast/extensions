import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAIL_DELIMITER, parseSelectedEmailResult } from "../src/helpers/mail";

describe("Mail Extraction Helpers", () => {
  it("parses valid raw result with subject, message id, and sender", () => {
    const raw = `Project Planning Meeting${MAIL_DELIMITER}CAB12345@mail.example.com${MAIL_DELIMITER}Alice Smith <alice@example.com>`;
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "Project Planning Meeting");
    assert.equal(parsed.messageId, "CAB12345@mail.example.com");
    assert.equal(parsed.sender, "Alice Smith <alice@example.com>");
    assert.equal(parsed.url, "message://%3CCAB12345@mail.example.com%3E");
  });

  it("strips wrapping angle brackets from message id", () => {
    const raw = `Invoice #1024${MAIL_DELIMITER}<INV-987654@billing.org>${MAIL_DELIMITER}billing@billing.org`;
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "Invoice #1024");
    assert.equal(parsed.messageId, "INV-987654@billing.org");
    assert.equal(parsed.url, "message://%3CINV-987654@billing.org%3E");
  });

  it("handles empty subject cleanly", () => {
    const raw = `   ${MAIL_DELIMITER}NOMSGID-123@example.com${MAIL_DELIMITER}noreply@example.com`;
    const parsed = parseSelectedEmailResult(raw);

    assert.ok(parsed);
    assert.equal(parsed.subject, "");
    assert.equal(parsed.messageId, "NOMSGID-123@example.com");
    assert.equal(parsed.url, "message://%3CNOMSGID-123@example.com%3E");
  });

  it("returns null when Mail is not running or no selection exists", () => {
    assert.equal(parseSelectedEmailResult("MAIL_NOT_RUNNING"), null);
    assert.equal(parseSelectedEmailResult("NO_SELECTION"), null);
    assert.equal(parseSelectedEmailResult(undefined), null);
    assert.equal(parseSelectedEmailResult(""), null);
  });

  it("returns null when message id is empty or delimiter missing", () => {
    assert.equal(parseSelectedEmailResult("Invalid text without delimiter"), null);
    assert.equal(parseSelectedEmailResult(`Subject only${MAIL_DELIMITER}`), null);
  });
});
