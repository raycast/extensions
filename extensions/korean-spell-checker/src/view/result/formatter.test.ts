import { Formatter } from "@view/result/formatter";

describe("Formatter", () => {
  describe("tests static methods", () => {
    it("handles newline characters", () => {
      const text = "음\n\n안녕하세요\n\n요즘 춥네요";
      const handled = Formatter.handleNewlineChars(text);
      expect(handled).toBe("음\r\n\r\n안녕하세요\r\n\r\n요즘 춥네요");
    });

    it("splits large text into chunks", () => {
      let largeText = "";
      const word = "large";

      for (let i = 0; i < Formatter.chunkSize; i++) {
        largeText += word;
      }

      expect(largeText.length).toBe(Formatter.chunkSize * word.length);

      const textChunks = Formatter.splitText(largeText);
      expect(textChunks.length).toBe(word.length);
    });
  });
});
