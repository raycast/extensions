import { ResultManager } from "@view/result/resultManager";
import { errInfosSamples } from "./samples";

describe("ResultManager", () => {
  errInfosSamples.forEach((sample) => {
    describe(`${sample.text}`, () => {
      const rm = new ResultManager(sample.text, sample.errInfos);
      let updatedText = rm.text;
      it("should update the word list", () => {
        sample.errInfos.forEach((errInfo) => {
          rm.updateWordList(errInfo.errorIdx, errInfo.candWords[0]);

          updatedText = updatedText.replace(errInfo.orgStr, errInfo.candWords[0]);
        });

        const result = rm.buildResult();
        expect(result).toBe(updatedText);
      });
    });
  });
});
