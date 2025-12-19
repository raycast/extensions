import { SvgSettings } from "../../types";

export const generateCanvasSvg = (
  activeLineIndex: number,
  linesLayout: number[][],
  allWords: string[],
  typedWords: string[],
  currentInput: string,
  settings: SvgSettings,
) => {
  const FONT_SIZE = parseInt(settings.fontSize);
  const CHAR_WIDTH = FONT_SIZE * 0.6;
  const LINE_HEIGHT = FONT_SIZE * 1.5;
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = LINE_HEIGHT * 3 + 20;
  const PADDING_X = 20;
  const BASELINE_OFFSET = FONT_SIZE;

  const C_COR = settings.colorCorrect;
  const C_ERR = settings.colorWrong;
  const C_NEXT = settings.colorNext;
  const C_BG_ACTIVE = settings.colorHighlight;
  const C_CURSOR = "#e2b714";

  let svgContent = "";
  const linesrender = [
    activeLineIndex - 1,
    activeLineIndex,
    activeLineIndex + 1,
  ];

  linesrender.forEach((lineIdx, relativePos) => {
    if (lineIdx < 0 || lineIdx >= linesLayout.length) return;
    const lineIndices = linesLayout[lineIdx];
    const yPos = relativePos * LINE_HEIGHT;
    const yText = yPos + BASELINE_OFFSET;
    let xPos = PADDING_X;
    const activeGlobalWordIndex = typedWords.length;

    lineIndices.forEach((wordIdx) => {
      const targetWord = allWords[wordIdx];
      const isActiveWord = wordIdx === activeGlobalWordIndex;
      const isPastWord = wordIdx < activeGlobalWordIndex;

      // Highlight Background
      if (isActiveWord && C_BG_ACTIVE !== "transparent") {
        const bgW = targetWord.length * CHAR_WIDTH + CHAR_WIDTH;
        const bgH = LINE_HEIGHT - 6;
        svgContent += `<rect x="${xPos - CHAR_WIDTH / 2}" y="${yPos + 4}" width="${bgW}" height="${bgH}" rx="6" fill="${C_BG_ACTIVE}" />`;
      }

      if (isPastWord) {
        const userTyped = typedWords[wordIdx];
        const color = userTyped === targetWord ? C_COR : C_ERR;
        svgContent += `<text x="${xPos}" y="${yText}" fill="${color}" font-family="monospace" font-size="${FONT_SIZE}">${targetWord}</text>`;
      } else if (isActiveWord) {
        const inputLen = currentInput.length;
        const targetLen = targetWord.length;
        // INTENTIONAL DESIGN: Only render characters up to target word length.
        // This prevents displaying extra characters typed beyond the word boundary,
        // matching Monkeytype's behavior where typos are counted but not shown.
        // Users can still type extra characters (tracked for accuracy calculation),
        // but the visual feedback stops at the word boundary to maintain clean UX.
        const maxLen = targetLen;
        let localX = xPos;
        for (let c = 0; c < maxLen; c++) {
          const targetChar = targetWord[c];
          const inputChar = c < inputLen ? currentInput[c] : "";
          const charColor =
            c >= inputLen ? C_NEXT : inputChar !== targetChar ? C_ERR : C_COR;

          svgContent += `<text x="${localX}" y="${yText}" fill="${charColor}" font-family="monospace" font-size="${FONT_SIZE}">${targetChar}</text>`;

          // Caret Rendering
          const isCursorPos = c === inputLen;
          if (isCursorPos) {
            if (settings.caretStyle === "block") {
              svgContent += `<rect x="${localX}" y="${yPos + 10}" width="${CHAR_WIDTH}" height="${FONT_SIZE}" fill="${C_CURSOR}" opacity="0.5"><animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" /></rect>`;
            } else if (settings.caretStyle === "line") {
              svgContent += `<rect x="${localX - 1}" y="${yPos + 5}" width="2" height="${FONT_SIZE}" fill="${C_CURSOR}"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>`;
            } else if (settings.caretStyle === "underscore") {
              svgContent += `<rect x="${localX}" y="${yText + 2}" width="${CHAR_WIDTH}" height="3" fill="${C_CURSOR}"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>`;
            }
          }
          localX += CHAR_WIDTH;
        }
        // Cursor at very end
        if (inputLen === maxLen) {
          const localX = xPos + maxLen * CHAR_WIDTH;
          if (settings.caretStyle === "block") {
            svgContent += `<rect x="${localX}" y="${yPos + 10}" width="${CHAR_WIDTH}" height="${FONT_SIZE}" fill="${C_CURSOR}" opacity="0.5"><animate attributeName="opacity" values="0.5;0;0.5" dur="1s" repeatCount="indefinite" /></rect>`;
          } else if (settings.caretStyle === "line") {
            svgContent += `<rect x="${localX - 1}" y="${yPos + 5}" width="2" height="${FONT_SIZE}" fill="${C_CURSOR}"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>`;
          } else if (settings.caretStyle === "underscore") {
            svgContent += `<rect x="${localX}" y="${yText + 2}" width="${CHAR_WIDTH}" height="3" fill="${C_CURSOR}"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" /></rect>`;
          }
        }
      } else {
        svgContent += `<text x="${xPos}" y="${yText}" fill="${C_NEXT}" font-family="monospace" font-size="${FONT_SIZE}">${targetWord}</text>`;
      }
      xPos += (targetWord.length + 1) * CHAR_WIDTH;
    });
  });

  const finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">${svgContent}</svg>`;
  return `![Game Board](data:image/svg+xml;base64,${Buffer.from(finalSvg).toString("base64")})`;
};
