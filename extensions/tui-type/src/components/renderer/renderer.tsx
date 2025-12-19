import { RenderMode, SvgSettings, TerminalSettings } from "../../types";
import { generateCanvasSvg } from "./svg";
import { generateTerminalView } from "./markdown";

export const render = (
  activeLineIndex: number,
  linesLayout: number[][],
  words: string[],
  typedWords: string[],
  currentInput: string,
  renderMode: RenderMode,
  svgSettings: SvgSettings,
  termSettings: TerminalSettings,
): string => {
  if (renderMode === "terminal") {
    return generateTerminalView(
      activeLineIndex,
      linesLayout,
      words,
      typedWords,
      currentInput,
      termSettings,
    );
  } else {
    return generateCanvasSvg(
      activeLineIndex,
      linesLayout,
      words,
      typedWords,
      currentInput,
      svgSettings,
    );
  }
};
