import { generateFakeAccountNumber, generateFakeSWIFT } from "../utils";
describe("Generate Data", () => {

  describe("generateFakeSWIFT", () => {
    it("should return a string of length 11", () => {
      const swift = generateFakeSWIFT();
      expect(swift).toHaveLength(8);
    });

    it("should only contain numbers", () => {
      const swift = generateFakeSWIFT();
      expect(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift)).toBe(true);
    });
  });

  describe("generateFakeAccountNumber", () => {
    it("should return a string of length 15", () => {
      const accountNumber = generateFakeAccountNumber();
      expect(accountNumber).toHaveLength(15);
    });

    it("should only contain numbers", () => {
      const accountNumber = generateFakeAccountNumber();
      expect(/^\d+$/.test(accountNumber)).toBe(true);
    });
  });
});
