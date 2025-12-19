import { TerminalSettings } from "../../types";

const applyTerminalStyle = (text: string, style: string) => {
  switch (style) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `*${text}*`;
    case "strikethrough":
      return `~~${text}~~`;
    case "link":
      return `[${text}](#)`;
    default:
      return text;
  }
};

export const generateTerminalView = (
  activeLineIndex: number,
  linesLayout: number[][],
  allWords: string[],
  typedWords: string[],
  currentInput: string,
  settings: TerminalSettings,
) => {
  const linesToRender = [
    activeLineIndex - 1,
    activeLineIndex,
    activeLineIndex + 1,
  ];
  let output = "";

  linesToRender.forEach((lineIdx) => {
    if (lineIdx < 0 || lineIdx >= linesLayout.length) {
      output += "\n";
      return;
    }
    const lineIndices = linesLayout[lineIdx];
    let lineStr = "";

    lineIndices.forEach((wordIdx) => {
      const targetWord = allWords[wordIdx];
      const isPast = wordIdx < typedWords.length;
      const isActive = wordIdx === typedWords.length;

      if (isPast) {
        const typed = typedWords[wordIdx];
        const isCorrect = typed === targetWord;
        if (isCorrect) {
          lineStr +=
            applyTerminalStyle(targetWord, settings.styleCorrect) + " ";
        } else {
          lineStr += applyTerminalStyle(targetWord, settings.styleWrong) + " ";
        }
      } else if (isActive) {
        let constructed = "";
        const inputLen = currentInput.length;
        const targetLen = targetWord.length;
        const maxLen = targetLen; // Only render up to the target word length

        for (let i = 0; i < maxLen; i++) {
          const char = targetWord[i];
          if (i === inputLen) constructed += settings.caretChar;
          constructed += char;
        }
        if (inputLen === maxLen) constructed += settings.caretChar;
        lineStr += applyTerminalStyle(constructed, settings.styleCurrent) + " ";
      } else {
        lineStr += targetWord + " ";
      }
    });
    output += lineStr + "\n\n";
  });
  return output;
};
