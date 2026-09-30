import { ErrInfo } from "@type";

export class ResultManager {
  public text: string;
  public errInfos: ErrInfo[];
  private wordList: { text: string; index: number }[];

  constructor(text: string, errInfos: ErrInfo[]) {
    this.text = text;
    this.errInfos = errInfos;
    this.wordList = this.buildWordList();
  }

  public buildResult() {
    let result = "";

    for (const { text } of this.wordList) {
      result += text;
    }

    return result;
  }

  public updateWordList(errorIdx: number, newWord: string) {
    this.wordList = this.wordList.map((word) => {
      if (word.index === errorIdx) {
        return { ...word, text: newWord };
      }
      return word;
    });
  }

  private buildWordList() {
    let pointer = 0;
    const wordList = this.errInfos.flatMap((errInfo) => {
      const nonErrorText = this.text.substring(pointer, errInfo.start);
      const orgStr = this.text.substring(errInfo.start, errInfo.end);
      pointer = errInfo.end;

      return [
        { text: nonErrorText, index: -1 },
        { text: orgStr, index: errInfo.errorIdx },
      ];
    });

    wordList.push({ text: this.text.substring(this.errInfos[this.errInfos.length - 1].end), index: -1 });
    return wordList.filter(({ text }) => text.length !== 0);
  }
}
