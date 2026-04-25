// Tests for export data utilities
import { toCsv, toJson } from "../lib/utils/exportData";

describe("exportData", () => {
  describe("toJson", () => {
    it("should convert records to pretty-printed JSON", () => {
      const records = [
        { id: 1, name: "test", value: 100 },
        { id: 2, name: "test2", value: 200 },
      ];
      const json = toJson(records);
      expect(json).toContain('"id": 1');
      expect(json).toContain('"name": "test"');
      expect(json).toContain('"value": 100');
    });

    it("should handle empty array", () => {
      const json = toJson([]);
      expect(json).toBe("[]");
    });
  });

  describe("toCsv", () => {
    it("should convert simple records to CSV", () => {
      const records = [
        { id: "1", name: "test", value: "100" },
        { id: "2", name: "test2", value: "200" },
      ];
      const csv = toCsv(records);
      const lines = csv.split("\n");

      // Check header
      expect(lines[0]).toBe("id,name,value");

      // Check data rows
      expect(lines[1]).toBe("1,test,100");
      expect(lines[2]).toBe("2,test2,200");
    });

    it("should escape fields with commas", () => {
      const records = [
        { id: "1", description: "hello, world" },
        { id: "2", description: "test" },
      ];
      const csv = toCsv(records);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("id,description");
      expect(lines[1]).toContain('"hello, world"');
      expect(lines[2]).toBe("2,test");
    });

    it("should escape fields with quotes", () => {
      const records = [{ id: "1", name: 'John "Joe" Smith' }];
      const csv = toCsv(records);
      const lines = csv.split("\n");

      expect(lines[1]).toBe('1,"John ""Joe"" Smith"');
    });

    it("should escape fields with newlines", () => {
      const records = [{ id: "1", text: "line1\nline2" }];
      const csv = toCsv(records);
      // CSV properly wraps multiline fields in quotes — the newline is preserved
      expect(csv).toContain('1,"line1');
      expect(csv).toContain('line2"');
    });

    it("should handle null and undefined values", () => {
      const records = [
        { id: "1", name: null, value: undefined },
        { id: "2", name: "test", value: "" },
      ];
      const csv = toCsv(records);
      const lines = csv.split("\n");

      expect(lines[1]).toBe("1,,");
      expect(lines[2]).toBe("2,test,");
    });

    it("should handle empty array", () => {
      const csv = toCsv([]);
      expect(csv).toBe("");
    });

    it("should handle numeric values", () => {
      const records = [{ id: 1, score: 99.5, active: true }] as unknown as Record<string, unknown>[];
      const csv = toCsv(records);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("id,score,active");
      expect(lines[1]).toBe("1,99.5,true");
    });
  });
});
