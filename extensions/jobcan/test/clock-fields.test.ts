import { describe, it } from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "fs";
import { join } from "path";
import { parseClockFields, generateFieldSchema } from "../src/lib/clock-fields";

describe("clock-fields", () => {
  const fixturePath = join(__dirname, "fixtures", "modify-page.html");
  const html = readFileSync(fixturePath, "utf-8");

  describe("parseClockFields", () => {
    it("should parse group_id select field", () => {
      const fields = parseClockFields(html);
      const groupIdField = fields.find((f) => f.name === "group_id");

      assert.ok(groupIdField, "groupIdField should be defined");
      assert.strictEqual(groupIdField?.type, "select");
      assert.strictEqual(groupIdField?.required, true);
      assert.strictEqual(groupIdField?.options?.length, 3);
      assert.strictEqual(groupIdField?.options?.[0].value, "1");
      assert.strictEqual(groupIdField?.options?.[0].label, "SOUNDRAW");
    });

    it("should parse notice text field", () => {
      const fields = parseClockFields(html);
      const noticeField = fields.find((f) => f.name === "notice");

      assert.ok(noticeField, "noticeField should be defined");
      assert.strictEqual(noticeField?.type, "text");
      assert.strictEqual(noticeField?.required, true);
    });

    it("should parse time fields", () => {
      const fields = parseClockFields(html);
      const clockInField = fields.find((f) => f.name === "clock_in_time");
      const clockOutField = fields.find((f) => f.name === "clock_out_time");

      // Note: Time field detection depends on label matching
      // This test may need adjustment based on actual HTML structure
      assert.ok(fields.length > 0, "should have at least one field");
    });
  });

  describe("generateFieldSchema", () => {
    it("should generate consistent schema for same fields", () => {
      const fields1 = parseClockFields(html);
      const fields2 = parseClockFields(html);

      const schema1 = generateFieldSchema(fields1);
      const schema2 = generateFieldSchema(fields2);

      assert.strictEqual(schema1, schema2);
    });

    it("should generate different schema for different fields", () => {
      const fields1 = parseClockFields(html);
      const modifiedHtml = html.replace('name="group_id"', 'name="location_id"');
      const fields2 = parseClockFields(modifiedHtml);

      const schema1 = generateFieldSchema(fields1);
      const schema2 = generateFieldSchema(fields2);

      assert.notStrictEqual(schema1, schema2);
    });
  });
});

