import { describe, expect, it } from "vitest";

import { buildSearchSql, escapeLikeTerm } from "./index-db";

describe("escapeLikeTerm", () => {
    it("passes through a plain term unchanged", () => {
        expect(escapeLikeTerm("hello world")).toBe("hello world");
        expect(escapeLikeTerm("")).toBe("");
    });

    it("escapes LIKE wildcards `%` and `_`", () => {
        expect(escapeLikeTerm("50% off")).toBe("50\\% off");
        expect(escapeLikeTerm("snake_case")).toBe("snake\\_case");
    });

    it("escapes single quotes by doubling them", () => {
        expect(escapeLikeTerm("it's")).toBe("it''s");
        expect(escapeLikeTerm("''")).toBe("''''");
    });

    it("escapes backslashes (the LIKE ESCAPE char)", () => {
        expect(escapeLikeTerm("a\\b")).toBe("a\\\\b");
    });

    it("escapes backslash FIRST so it does not double-escape our own escapes", () => {
        // `\\%` after escaping should become `\\\\\\%` — backslash doubled,
        // then `%` independently prefixed with a single new backslash.
        expect(escapeLikeTerm("\\%")).toBe("\\\\\\%");
        expect(escapeLikeTerm("\\_")).toBe("\\\\\\_");
    });

    it("handles a mix of all special characters", () => {
        expect(escapeLikeTerm("a'b%c_d\\e")).toBe("a''b\\%c\\_d\\\\e");
    });
});

describe("buildSearchSql", () => {
    it("wraps the escaped term as a LIKE substring with ESCAPE and a LIMIT cap", () => {
        expect(buildSearchSql("hello")).toBe(
            "SELECT id, content FROM text_index WHERE content LIKE '%' || 'hello' || '%' ESCAPE '\\' LIMIT 500;",
        );
    });

    it("embeds escaped special characters safely", () => {
        expect(buildSearchSql("it's 50%")).toBe(
            "SELECT id, content FROM text_index WHERE content LIKE '%' || 'it''s 50\\%' || '%' ESCAPE '\\' LIMIT 500;",
        );
    });
});
