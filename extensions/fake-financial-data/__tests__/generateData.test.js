const { beforeEach } = require("node:test");
const { generateFakeAccountNumber, generateFakeSWIFT } = require("../utils");
const { Clipboard, showHUD } = require("@raycast/api");

describe("Generate Data", () => {
  jest.mock("@raycast/api", () => ({
    Clipboard: {
      copy: jest.fn(),
    },
    showHUD: jest.fn(),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    Clipboard.copy.mockReturnValue(true);
    showHUD.mockReturnValue(true);
  });

  describe("generateFakeSWIFT", () => {
    it("should return a string of length 11", () => {
      const swift = generateFakeSWIFT();
      expect(swift).toHaveLength(11);
    });

    it("should only contain numbers", () => {
      const swift = generateFakeSWIFT();
      expect(/^\d+$/.test(swift)).toBe(true);
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
