import { markdownTable } from "./format";

describe("markdownTable", () => {
    it("escapes pipes and normalizes newlines in table cells", () => {
        expect(markdownTable(["Field", "Value"], [["A|B", "line 1\nline 2"]])).toContain(
            "| A\\|B | line 1<br>line 2 |",
        );
    });
});
