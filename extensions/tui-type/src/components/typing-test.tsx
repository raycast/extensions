import { useMemo } from "react";
import { render } from "./renderer/renderer";
import { TypingGameState } from "../hooks/useTypingGame";

interface TypingTestProps extends TypingGameState {}

export default function TypingTest(props: TypingTestProps) {
  const {
    words,
    linesLayout,
    typedWordsRef,
    currentInputRef,
    renderMode,
    svgSettings,
    termSettings,
    visualTick,
  } = props;

  const markdownContent = useMemo(() => {
    if (words.length === 0) return "";
    const activeWordIndex = typedWordsRef.current.length;
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
      typedWordsRef.current,
      currentInputRef.current,
      renderMode,
      svgSettings,
      termSettings,
    );
  }, [
    words,
    linesLayout,
    typedWordsRef,
    currentInputRef,
    renderMode,
    svgSettings,
    termSettings,
    visualTick,
  ]);

  return markdownContent;
}
