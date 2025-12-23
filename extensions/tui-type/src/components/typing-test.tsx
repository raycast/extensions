import { useMemo } from "react";
import { render } from "./renderer/renderer";
import { useTestStore } from "../hooks/store/test/useTestState";
import { useSettingsStore } from "../hooks/store/settings/useSettings";
import { getCharsPerLine } from "../config/render-mode-config";

export default function TypingTest() {
  const { words, visualTick, typedWords, currentInput } = useTestStore();
  const { renderMode, svgSettings, termSettings } = useSettingsStore();

  const charsLimit = getCharsPerLine(renderMode);
  const linesLayout = (() => {
    const lines: number[][] = [];
    let currentLine: number[] = [];
    let currentLen = 0;
    words.forEach((word, index) => {
      if (currentLen + word.length + 1 > charsLimit) {
        lines.push(currentLine);
        currentLine = [];
        currentLen = 0;
      }
      currentLine.push(index);
      currentLen += word.length + 1;
    });
    if (currentLine.length > 0) lines.push(currentLine);
    return lines;
  })();

  const markdownContent = useMemo(() => {
    if (words.length === 0) return "";
    const activeWordIndex = typedWords.length;
    let activeLineIdx = 0;
    for (let i = 0; i < linesLayout.length; i++) {
      if (linesLayout[i].includes(activeWordIndex)) {
        activeLineIdx = i;
        break;
      }
    }
    return render(
      activeLineIdx,
      linesLayout,
      words,
      typedWords,
      currentInput,
      renderMode,
      svgSettings,
      termSettings,
    );
  }, [
    words,
    linesLayout,
    typedWords,
    currentInput,
    renderMode,
    svgSettings,
    termSettings,
    visualTick,
  ]);

  return markdownContent;
}
