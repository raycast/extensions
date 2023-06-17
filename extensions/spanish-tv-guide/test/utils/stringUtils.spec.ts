import { truncate } from "../../src/utils/stringUtils";

describe("string utils", () => {
    it("does not truncate short text", () => {
        expect(truncate("short text")).toEqual("short text");
    })

    it("truncates long text", () => {
        expect(truncate("Truncates very long text that contains more than 60 characters"))
            .toEqual("Truncates very long text that contains more than 60…");
    });
});