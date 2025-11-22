import { describe, it, expect } from "vitest";
import { buildQuery, processUserInputAndFilter, isJQL, isCQL, hasOrderBy } from "../src/utils/query";
import type { SearchFilter } from "../src/types/search-bar-accessory";

describe("Query Builder", () => {
  describe("buildQuery", () => {
    it("should build a simple query with AND operator", () => {
      const result = buildQuery({
        clauses: ["project = 'TEST'", "status = 'Open'"],
        logicOperator: "AND",
        queryType: "JQL",
      });

      expect(result).toBe("(project = 'TEST') AND (status = 'Open')");
    });

    it("should build a query with OR operator", () => {
      const result = buildQuery({
        clauses: ["project = 'TEST'", "assignee = currentUser()"],
        logicOperator: "OR",
        queryType: "JQL",
      });

      expect(result).toBe("(project = 'TEST') OR (assignee = currentUser())");
    });

    it("should build a query with ORDER BY", () => {
      const result = buildQuery({
        clauses: ["project = 'TEST'"],
        logicOperator: "AND",
        orderBy: "created DESC",
        queryType: "JQL",
      });

      expect(result).toBe("project = 'TEST' ORDER BY created DESC");
    });

    it("should handle empty clauses", () => {
      const result = buildQuery({
        clauses: [],
        logicOperator: "AND",
        queryType: "JQL",
      });

      expect(result).toBe("");
    });

    it("should handle single clause", () => {
      const result = buildQuery({
        clauses: ["project = 'TEST'"],
        logicOperator: "AND",
        queryType: "JQL",
      });

      expect(result).toBe("project = 'TEST'");
    });

    it("should format query with multiple spaces", () => {
      const result = buildQuery({
        clauses: ["project = 'TEST'   ", "  status = 'Open'"],
        logicOperator: "AND",
        queryType: "JQL",
      });

      expect(result).toBe("(project = 'TEST') AND (status = 'Open')");
    });
  });

  describe("processUserInputAndFilter", () => {
    it("should handle complete JQL query with ORDER BY", () => {
      const result = processUserInputAndFilter({
        userInput: "project = 'TEST' ORDER BY created DESC",
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(result).toBe("project = 'TEST' ORDER BY created DESC");
    });

    it("should handle complete JQL query without ORDER BY", () => {
      const filter: SearchFilter = {
        value: "test",
        query: "status = 'Open'",
        orderBy: " ORDER BY created DESC",
      };

      const result = processUserInputAndFilter({
        userInput: "project = 'TEST'",
        filter,
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        expect(result.clauses).toEqual(["project = 'TEST'"]);
        expect(result.orderBy).toBe(" ORDER BY created DESC");
      }
    });

    it("should handle text input with filter", () => {
      const filter: SearchFilter = {
        value: "test",
        query: "project = 'TEST'",
      };

      const result = processUserInputAndFilter({
        userInput: "test",
        filter,
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        expect(result.clauses).toEqual(['text ~ "test"', "project = 'TEST'"]);
        expect(result.logicOperator).toBe("AND");
      }
    });

    it("should handle text input without filter", () => {
      const result = processUserInputAndFilter({
        userInput: "test",
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        expect(result.clauses).toEqual(['text ~ "test"']);
        expect(result.logicOperator).toBe("AND");
      }
    });

    it("should escape quotes in non-JQL input", () => {
      const result = processUserInputAndFilter({
        userInput: 'test "with quotes"',
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        expect(result.clauses).toEqual(['text ~ "test \\"with quotes\\""']);
        expect(result.logicOperator).toBe("AND");
      }
    });

    it("should escape single quotes in non-JQL input", () => {
      const result = processUserInputAndFilter({
        userInput: "test 'with single quotes'",
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        expect(result.clauses).toEqual(["text ~ \"test \\'with single quotes\\'\""]);
        expect(result.logicOperator).toBe("AND");
      }
    });

    it("should not escape quotes in complete JQL input", () => {
      const result = processUserInputAndFilter({
        userInput: 'project = "TEST"',
        buildClauseFromText: (input) => `text ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        expect(result.clauses).toEqual(['project = "TEST"']);
        expect(result.logicOperator).toBe("AND");
      }
    });

    it("should treat invalid JQL with quote-only values as text input", () => {
      const result = processUserInputAndFilter({
        userInput: 'project = ""',
        buildClauseFromText: (input) => `title ~ "${input}"`,
        queryType: "JQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        // Should be treated as text, so quotes should be escaped
        expect(result.clauses).toEqual(['title ~ "project = \\"\\""']);
        expect(result.logicOperator).toBe("AND");
      }
    });

    it("should handle CQL quote escaping the same as JQL", () => {
      const result = processUserInputAndFilter({
        userInput: 'test "with quotes"',
        buildClauseFromText: (input) => `user.fullname ~ "${input}"`,
        queryType: "CQL",
      });

      expect(typeof result).toBe("object");
      if (typeof result === "object") {
        // For CQL, quotes should be escaped with backslashes like JQL
        expect(result.clauses).toEqual(['user.fullname ~ "test \\"with quotes\\""']);
        expect(result.logicOperator).toBe("AND");
      }
    });
  });

  describe("syntax detection", () => {
    it("should detect JQL syntax", () => {
      expect(isJQL("project = 'TEST' AND status is EMPTY")).toBe(true);
      expect(isJQL("assignee was 'john'")).toBe(true);
      expect(isJQL("status is NULL")).toBe(true);
      expect(isJQL("simple text")).toBe(false);
    });

    it("should reject JQL with quote-only values", () => {
      expect(isJQL('project = "')).toBe(false);
      expect(isJQL('project = ""')).toBe(false);
      expect(isJQL("project = '")).toBe(false);
      expect(isJQL("project = ''")).toBe(false);
      expect(isJQL('assignee = "')).toBe(false);
      expect(isJQL('assignee = ""')).toBe(false);
    });

    it("should detect CQL syntax", () => {
      expect(isCQL("space.key = 'TEST'")).toBe(true);
      expect(isCQL("ancestor = '123'")).toBe(true);
      expect(isCQL("container = '456'")).toBe(true);
      expect(isCQL("simple text")).toBe(false);
    });

    it("should reject CQL with quote-only values", () => {
      expect(isCQL('space.key = "')).toBe(false);
      expect(isCQL('space.key = ""')).toBe(false);
      expect(isCQL("space.key = '")).toBe(false);
      expect(isCQL("space.key = ''")).toBe(false);
      expect(isCQL('ancestor = "')).toBe(false);
      expect(isCQL('ancestor = ""')).toBe(false);
    });

    it("should detect ORDER BY", () => {
      expect(hasOrderBy("project = 'TEST' ORDER BY created DESC")).toBe(true);
      expect(hasOrderBy("project = 'TEST' order by created DESC")).toBe(true);
      expect(hasOrderBy("type = 'page' ORDER BY created DESC")).toBe(true);
      expect(hasOrderBy("type = 'page' order by created DESC")).toBe(true);
      expect(hasOrderBy("project = 'TEST'")).toBe(false);
      expect(hasOrderBy("type = 'page'")).toBe(false);
      expect(hasOrderBy("ORDER BY")).toBe(false);
      expect(hasOrderBy("ORDER BY ")).toBe(false);
    });
  });
});
