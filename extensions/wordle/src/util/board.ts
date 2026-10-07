import { GUESS_LIMIT, LANGUAGE_KEYBOARD_LAYOUT_MAP, WORD_LENGTH } from "@src/constants";
import { Guess, HintType, Language } from "@src/types";
import { determineLetterHintTypes, getUppercaseValue } from "@src/util";

type Theme = "dark" | "light";

type Palette = {
  emptyBorder: string;
  typedBorder: string;
  invalidBorder: string;
  typedText: string;
  correct: string;
  present: string;
  absent: string;
  keyUnused: string;
  keyUnusedText: string;
  caption: string;
};

// Colors of the official Wordle in dark and light mode.
const PALETTES: Record<Theme, Palette> = {
  dark: {
    emptyBorder: "#3a3a3c",
    typedBorder: "#565758",
    invalidBorder: "#e5534b",
    typedText: "#ffffff",
    correct: "#538d4e",
    present: "#b59f3b",
    absent: "#3a3a3c",
    keyUnused: "#818384",
    keyUnusedText: "#ffffff",
    caption: "#9b9b9d",
  },
  light: {
    emptyBorder: "#d3d6da",
    typedBorder: "#878a8c",
    invalidBorder: "#d9534f",
    typedText: "#1a1a1b",
    correct: "#6aaa64",
    present: "#c9b458",
    absent: "#787c7e",
    keyUnused: "#d3d6da",
    keyUnusedText: "#1a1a1b",
    caption: "#6b6e70",
  },
};

const TILE_SIZE = 34;
const TILE_GAP = 4;
const KEY_WIDTH = 24;
const KEY_HEIGHT = 30;
const KEY_GAP = 3;
const BOARD_KEYBOARD_GAP = 14;
const PADDING = 4;
const CAPTION_HEIGHT = 24;
const WIDTH = 290;

const BOARD_WIDTH = WORD_LENGTH * TILE_SIZE + (WORD_LENGTH - 1) * TILE_GAP;
const BOARD_HEIGHT = GUESS_LIMIT * TILE_SIZE + (GUESS_LIMIT - 1) * TILE_GAP;

const getHintColors = (palette: Palette) => ({
  [HintType.CORRECT_POSITION]: palette.correct,
  [HintType.INCORRECT_POSITION]: palette.present,
  [HintType.NON_EXISTENT]: palette.absent,
});

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const renderText = (
  value: string,
  centerX: number,
  centerY: number,
  fontSize: number,
  color: string,
  fontWeight = 700
) =>
  `<text x="${centerX}" y="${centerY + fontSize * 0.35}" font-family="-apple-system, Helvetica, Arial, sans-serif" ` +
  `font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="middle">${escapeXml(value)}</text>`;

type RenderBoardProps = {
  guesses: Guess[];
  input: string;
  isInputInvalid: boolean;
  language: Language;
  theme: Theme;
  showKeyboard?: boolean;
  caption?: string;
};

export const renderBoardSvg = ({
  guesses,
  input,
  isInputInvalid,
  language,
  theme,
  showKeyboard = true,
  caption,
}: RenderBoardProps): string => {
  const palette = PALETTES[theme];
  const hintColors = getHintColors(palette);
  const boardX = (WIDTH - BOARD_WIDTH) / 2;
  const elements: string[] = [];

  for (let row = 0; row < GUESS_LIMIT; row++) {
    const guess = guesses[row];
    const isInputRow = row === guesses.length;
    const typedLetters = isInputRow ? Array.from(input.slice(0, WORD_LENGTH)) : [];

    for (let column = 0; column < WORD_LENGTH; column++) {
      const x = boardX + column * (TILE_SIZE + TILE_GAP);
      const y = PADDING + row * (TILE_SIZE + TILE_GAP);
      const centerX = x + TILE_SIZE / 2;
      const centerY = y + TILE_SIZE / 2;

      if (guess) {
        const hint = guess.hints[column];
        elements.push(
          `<rect x="${x}" y="${y}" width="${TILE_SIZE}" height="${TILE_SIZE}" rx="2" fill="${hintColors[hint.type]}"/>`,
          renderText(getUppercaseValue(hint.value), centerX, centerY, 20, "#ffffff")
        );
        continue;
      }

      const typedLetter = typedLetters[column];
      const stroke = typedLetter ? (isInputInvalid ? palette.invalidBorder : palette.typedBorder) : palette.emptyBorder;
      elements.push(
        `<rect x="${x + 1}" y="${y + 1}" width="${TILE_SIZE - 2}" height="${TILE_SIZE - 2}" rx="2" ` +
          `fill="none" stroke="${stroke}" stroke-width="2"/>`
      );
      if (typedLetter)
        elements.push(renderText(getUppercaseValue(typedLetter), centerX, centerY, 20, palette.typedText));
    }
  }

  const keyboardY = PADDING + BOARD_HEIGHT + BOARD_KEYBOARD_GAP;

  if (showKeyboard) {
    const letterHintTypes = determineLetterHintTypes(guesses);
    LANGUAGE_KEYBOARD_LAYOUT_MAP[language].forEach((keys, row) => {
      const rowWidth = keys.length * KEY_WIDTH + (keys.length - 1) * KEY_GAP;
      const rowX = (WIDTH - rowWidth) / 2;
      const y = keyboardY + row * (KEY_HEIGHT + KEY_GAP);

      Array.from(keys).forEach((letter, column) => {
        const x = rowX + column * (KEY_WIDTH + KEY_GAP);
        const hintType = letterHintTypes.get(letter);
        const fill = hintType === undefined ? palette.keyUnused : hintColors[hintType];
        const textColor = hintType === undefined ? palette.keyUnusedText : "#ffffff";
        elements.push(
          `<rect x="${x}" y="${y}" width="${KEY_WIDTH}" height="${KEY_HEIGHT}" rx="3" fill="${fill}"/>`,
          renderText(getUppercaseValue(letter), x + KEY_WIDTH / 2, y + KEY_HEIGHT / 2, 12, textColor)
        );
      });
    });
  }

  const captionHeight = caption ? CAPTION_HEIGHT : 0;
  if (caption)
    elements.push(
      renderText(caption, WIDTH / 2, PADDING + BOARD_HEIGHT + CAPTION_HEIGHT / 2 + 4, 13, palette.caption, 500)
    );

  const height = showKeyboard
    ? keyboardY + 3 * KEY_HEIGHT + 2 * KEY_GAP + PADDING
    : PADDING + BOARD_HEIGHT + captionHeight + PADDING;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">` +
    `${elements.join("")}</svg>`
  );
};

const toMarkdownImage = (alt: string, svg: string) =>
  `![${alt}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;

export const getBoardMarkdown = (props: RenderBoardProps): string =>
  toMarkdownImage("Wordle board", renderBoardSvg(props));

export type ExampleTile = { letter: string; type?: HintType };

const EXAMPLE_TILE_SIZE = 36;

// A single row of tiles for the "How To Play" examples. Tiles without a type are shown as typed, but not revealed.
export const getExampleRowMarkdown = (tiles: ExampleTile[], theme: Theme): string => {
  const palette = PALETTES[theme];
  const hintColors = getHintColors(palette);
  const width = tiles.length * EXAMPLE_TILE_SIZE + (tiles.length - 1) * TILE_GAP;

  const elements = tiles.flatMap(({ letter, type }, column) => {
    const x = column * (EXAMPLE_TILE_SIZE + TILE_GAP);
    const centerX = x + EXAMPLE_TILE_SIZE / 2;
    const centerY = EXAMPLE_TILE_SIZE / 2;
    const text = getUppercaseValue(letter);
    if (type === undefined)
      return [
        `<rect x="${x + 1}" y="1" width="${EXAMPLE_TILE_SIZE - 2}" height="${EXAMPLE_TILE_SIZE - 2}" rx="2" ` +
          `fill="none" stroke="${palette.typedBorder}" stroke-width="2"/>`,
        renderText(text, centerX, centerY, 22, palette.typedText),
      ];
    return [
      `<rect x="${x}" y="0" width="${EXAMPLE_TILE_SIZE}" height="${EXAMPLE_TILE_SIZE}" rx="2" fill="${hintColors[type]}"/>`,
      renderText(text, centerX, centerY, 22, "#ffffff"),
    ];
  });

  return toMarkdownImage(
    tiles.map((tile) => tile.letter).join(""),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${EXAMPLE_TILE_SIZE}" ` +
      `viewBox="0 0 ${width} ${EXAMPLE_TILE_SIZE}">${elements.join("")}</svg>`
  );
};
