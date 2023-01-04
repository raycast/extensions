import { ErrInfo } from "@type";

export class Formatter {
  public static readonly chunkSize = 1000;

  public static handleNewlineChars(text: string) {
    return text.replaceAll(/\n/g, "\r\n");
  }

  public static splitText(text: string): string[] {
    const chunkSize = Formatter.chunkSize;
    const numChunks = Math.ceil(text.length / chunkSize);
    const chunks = Array.from({ length: numChunks }, (_, idx) =>
      text.substring(idx * chunkSize, (idx + 1) * chunkSize)
    );
    return chunks;
  }

  public text: string;

  constructor(text: string) {
    this.text = text;
  }

  public formatText(text: string, errInfo: ErrInfo, newWord = ""): string {
    const inlineCodeAdded = `${text.substring(0, errInfo.start)}\`${errInfo.orgStr.trim()}\`${text.substring(
      errInfo.end
    )}`;

    return `
${this.shouldAddDots(text)}${inlineCodeAdded.substring(errInfo.start - 60, errInfo.end + 60)}${this.shouldAddDots(text)}

\`\`\`
${this.suggestedWords(errInfo, newWord)}
\`\`\`

---

${this.formatHelpString(errInfo.help)}
`;
  }

  private suggestedWords(errInfo: ErrInfo, newWord: string) {
    if (errInfo.candWords.length === 1 && errInfo.candWords[0].length === 0) {
      return `${errInfo.orgStr} -> No suggestions`;
    }

    const choices = errInfo.candWords.map((choice) => {
      if (choice === newWord) {
        return `${choice} [selected]`;
      }
      return choice;
    });
    return `${errInfo.orgStr} -> ${choices.join(" | ")}`;
  }

  private formatHelpString(help: string) {
    if (!help.includes("(예)")) {
      return help;
    }

    function replacer(match: string): string {
      const linesInExamples = match
        .replace("(예)", "")
        .split(/\([○XO×ox]\)/)
        .slice(0, -1);

      const formattedExamples = linesInExamples.map(
        (line, index) => line.replace("->", "").trim() + (index % 2 === 0 ? "(X)" : "(O)\n")
      );

      return `
\`\`\`
예:

${formattedExamples.join("\r\n")}
\`\`\`
`;
    }

    const formattedHelpString = help.replaceAll(
      /\(예\).*?\([○XO×ox]\)(\d.)|\(예\).*?\([○XO×ox]\)$|\(예\).*\([○XO×ox]\)/g,
      replacer
    );

    return formattedHelpString;
  }

  private shouldAddDots(text: string) {
    return text.length > 60 ? "…" : "";
  }
}
