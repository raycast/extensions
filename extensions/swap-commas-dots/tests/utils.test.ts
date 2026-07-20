import { swapCommasAndDots } from "../src/utils";

describe("swapCommasAndDots", () => {
  it("should swap commas and dots", () => {
    expect(swapCommasAndDots("1,234.56")).toBe("1.234,56");
  });

  it("should swap multiple occurrences", () => {
    expect(swapCommasAndDots("1,234.56,789.01")).toBe("1.234,56.789,01");
  });

  it("should do nothing if there are no commas or dots", () => {
    expect(swapCommasAndDots("1234567890")).toBe("1234567890");
  });

  it("should do nothing on empty string", () => {
    expect(swapCommasAndDots("")).toBe("");
  });
});
