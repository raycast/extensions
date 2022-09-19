import { decodeURL, encodeURL } from "../src/actions"
describe("actions", () => {
  describe("URL", () => {
    it("should encode URL", () => {
      const actual = encodeURL("http://www.baidu.com?query=hello world");

      expect(actual.value).toEqual("http://www.baidu.com?query=hello%20world");
      expect(actual.error).toBeUndefined();
    });

    it("should decode encoded URL", () => {
      const actual = decodeURL("http://www.baidu.com?query=hello%20world");

      expect(actual.value).toEqual("http://www.baidu.com?query=hello world");
      expect(actual.error).toBeUndefined();
    });

    it("should raise error if invalid URL given", () => {
      const result = decodeURL("http://www.baidu.com?query=20%");
      expect(result.error.message).toEqual("Invalid URL");
    });
  });
});
