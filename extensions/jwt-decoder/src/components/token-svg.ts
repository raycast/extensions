import {
  dataColor,
  dataTextOffset,
  footColor,
  headColor,
  subColor,
  textLineHeight,
  textLineStandardOffset,
  textOffSet,
  textWidth,
  textWidthWide,
  titleColor,
  twRegex,
} from "../constants";
import { displayValue } from "../utils/display-value";
import { atob } from "buffer";
import { TokenItem } from "../utils/list-from-object";

function partToJsonStringArray(part: string): string[] {
  return JSON.stringify(JSON.parse(atob(part)), null, 2).split("\n");
}

interface TokenSvgProps {
  clipboard: string;
  showToken?: boolean;
  showDetail?: boolean;
  section?: string;
  definition?: TokenItem;
}

/**
 * Escapes a value for safe use inside a double-quoted XML/SVG attribute.
 */
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Escapes a value for safe use as XML/SVG text content.
 */
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Attrs = Record<string, string | number | undefined>;

/**
 * Serializes attribute pairs, omitting `undefined` values so they behave like
 * absent JSX props rather than rendering `attr="undefined"`.
 */
function attrs(pairs: Attrs): string {
  return Object.entries(pairs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${escapeAttr(String(value))}"`)
    .join("");
}

function tspan(pairs: Attrs, content?: string): string {
  if (content === undefined) {
    return `<tspan${attrs(pairs)}/>`;
  }
  return `<tspan${attrs(pairs)}>${escapeText(content)}</tspan>`;
}

/**
 * Renders the decoded-token visualization as a static SVG string.
 *
 * Built with plain template literals instead of a render library. Raycast
 * externalizes `react` at build time (the host provides it at runtime), while a
 * bundled server renderer would be pinned to a fixed version. When the host
 * React version drifts, its internal version check throws "Incompatible React
 * versions". Producing the string directly removes that dependency entirely.
 *
 * `xmlns` is required so the output is a valid standalone SVG document when
 * embedded as a data: URI (Detail markdown images).
 */
export function renderTokenSvgToString({
  clipboard,
  showToken,
  showDetail,
  section,
  definition,
}: TokenSvgProps): string {
  const bits = clipboard.split(".");
  const headJSON = partToJsonStringArray(bits[0]);
  const bodyJSON = partToJsonStringArray(bits[1]);

  const twoColumn = !!(showToken && showDetail);
  const TARGET_FONT_PX = 16;
  const BASE_FONT_PX = 8; // the .mono font-size below, in user units
  const gridCols = 8;
  const leftCols = 4; // divider sits at leftCols/8 of the width
  const glyphWidth = 4.8; // Menlo advance at 8px, for placing columns accurately
  const columnGap = textLineHeight;

  const tokenLeftPad = twoColumn ? columnGap : textOffSet;
  const tokenWrap = twoColumn ? 30 : textWidth;
  const tokenRegex = twoColumn ? new RegExp(`.{1,${tokenWrap}}`, "g") : twRegex;

  const head = bits[0].match(tokenRegex);
  const hOffset = tokenWrap - 1 - (head ?? [""]).slice(-1)[0].length;
  const data = [bits[1].substring(0, hOffset), ...(bits[1].substring(hOffset).match(tokenRegex) ?? [])];
  const dOffset = tokenWrap - 1 - data.slice(-1)[0].length;
  const definitionRow = definition?.row ? definition.row[1].match(twRegex) || [] : [];
  const foot = [bits[2].substring(0, dOffset), ...(bits[2].substring(dOffset).match(tokenRegex) ?? [])];

  const tokenExtent = tokenLeftPad + tokenWrap * glyphWidth; // right edge of the token column
  const leftRegion = tokenExtent + columnGap; // columns 0..leftCols
  const gridUnit = leftRegion / leftCols; // one of the 8 columns
  const gridWidth = gridUnit * gridCols; // full width, edge to edge
  const dividerX = leftRegion; // the leftCols/8 boundary
  const rightColX = dividerX + columnGap; // detail text start (just past leftCols)
  const detailChars = Math.max(1, Math.floor((gridWidth - rightColX - columnGap) / glyphWidth));

  const dTextOffset = twoColumn ? rightColX : showToken ? dataTextOffset : textOffSet;

  const style = [
    ".mono  { font-family: Menlo; font-size: 8px; }",
    `.title { font-family: Helvetica; font-size: 7px }`,
    `.main  { fill: ${titleColor}; }`,
    `.sub   { fill: ${subColor}; }`,
    `.head  { fill: ${headColor}; ${section === "head" ? "font-weight: bold; " : ""}}`,
    `.data  { fill: ${dataColor}; ${section === "data" ? "font-weight: bold; " : ""}}`,
    `.foot  { fill: ${footColor}; }`,
  ].join("\n");

  let text = "";

  // DECODED DATA
  if (showDetail) {
    text += tspan({ class: "title main", x: dTextOffset, y: textLineStandardOffset }, "HEADER: ");
    text += tspan({ class: "title sub", dx: 0, dy: 0 }, "ALGORITHM & TOKEN TYPE");
    text += tspan(
      { class: "head", x: dTextOffset, dy: textLineHeight - textLineStandardOffset },
      "{" + " ".repeat(showToken ? textWidth - 1 : textWidthWide - 1),
    );
    text += headJSON
      .slice(1)
      .map((item) =>
        tspan(
          { class: "head", x: dTextOffset, dy: textLineHeight },
          displayValue(item, undefined, showToken, twoColumn ? detailChars : undefined),
        ),
      )
      .join("");
    text += tspan({ class: "title main", x: dTextOffset, dy: textLineHeight + textLineStandardOffset }, "PAYLOAD: ");
    text += tspan({ class: "title sub", dx: 0, dy: 0 }, "DATA");
    text += bodyJSON
      .map((item) =>
        tspan(
          { class: "data", x: dTextOffset, dy: textLineHeight },
          displayValue(item, undefined, showToken, twoColumn ? detailChars : undefined),
        ),
      )
      .join("");
    text += tspan({ x: dTextOffset, dy: textLineHeight });
  }

  // DEFINITION
  if (definition) {
    text += tspan({ x: textOffSet, y: 0, class: "mono main" }, `${definition.key}: `);
    text += tspan({ dx: 0, dy: 0, class: "mono data" }, displayValue(definition.value, definition.key, showToken));
    text += definitionRow.map((row) => tspan({ x: textOffSet, dy: textLineHeight, class: "mono sub" }, row)).join("");
    if (definitionRow.length == 0) {
      text += tspan({ x: textOffSet, dy: textLineHeight });
    }
    if (definitionRow.length <= 1) {
      text += tspan({ x: textOffSet, dy: textLineHeight });
    }
  }

  // TOKEN PARTS
  if (showToken) {
    if (head) {
      text += head
        .map((row, i) =>
          tspan(
            {
              x: tokenLeftPad,
              dy: i == 0 && !definition ? 0 : textLineHeight,
              y: i == 0 && !definition ? 0 : undefined,
              class: "mono head",
            },
            row,
          ),
        )
        .join("");
    }
    text += tspan({ dx: 0, dy: 0 }, ".");
    text += data
      .map((row, i) =>
        tspan(
          { x: i == 0 ? undefined : tokenLeftPad, dx: "0", dy: i == 0 ? 0 : textLineHeight, class: "mono data" },
          row,
        ),
      )
      .join("");
    text += tspan({ dx: 0, dy: 0 }, ".");
    text += foot
      .map((row, i) =>
        tspan(
          { x: i == 0 ? undefined : tokenLeftPad, dx: "0", dy: i == 0 ? 0 : textLineHeight, class: "mono foot" },
          row,
        ),
      )
      .join("");
    text += tspan({ x: tokenLeftPad, dy: textLineHeight });
  }

  const detailLines = showDetail ? 1 + Math.max(headJSON.length - 1, 0) + 1 + bodyJSON.length + 1 : 0;
  const definitionLines = definition
    ? 1 + definitionRow.length + (definitionRow.length === 0 ? 1 : 0) + (definitionRow.length <= 1 ? 1 : 0)
    : 0;
  const tokenLines = showToken ? (head?.length ?? 0) + data.length + foot.length + 1 : 0;
  const lineCount = twoColumn ? Math.max(detailLines, tokenLines) : detailLines + definitionLines + tokenLines;

  const marginLeft = twoColumn ? 0 : textOffSet;
  const marginRight = twoColumn ? 0 : textLineHeight;
  const marginTop = textLineHeight;
  const marginBottom = textLineHeight;

  // charWidth is Menlo's ~0.6em advance at 8px, rounded up so estimates never
  // fall short and clip the last column.
  const charWidth = 5;
  const detailRight = showDetail ? dTextOffset + (showToken ? textWidth : textWidthWide) * charWidth : 0;
  const tokenRight = showToken ? textOffSet + textWidth * charWidth : 0;
  const definitionRight = definition ? textOffSet + textWidth * charWidth : 0;

  const contentLeft = twoColumn ? 0 : textOffSet;
  const contentRight = twoColumn ? gridWidth : Math.max(detailRight, tokenRight, definitionRight);
  const contentBottom = lineCount * textLineHeight;

  const viewMinX = contentLeft - marginLeft;
  const viewMinY = -marginTop;
  const contentWidth = Math.ceil(contentRight - contentLeft + marginLeft + marginRight);
  const contentHeight = Math.ceil(contentBottom + marginTop + marginBottom);

  const divider = twoColumn
    ? `<path d="M${dividerX},${viewMinY} L${dividerX},${viewMinY + contentHeight}" stroke="rgb(151,151,151)" stroke-width="0.25"/>`
    : "";

  const displayWidth = twoColumn ? Math.ceil(contentWidth * (TARGET_FONT_PX / BASE_FONT_PX)) : 2400;
  const displayHeight = Math.ceil(displayWidth * (contentHeight / contentWidth));

  return `<svg width="${displayWidth}" height="${displayHeight}" viewBox="${viewMinX} ${viewMinY} ${contentWidth} ${contentHeight}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg"><style>${style}</style><g>${divider}<text x="0" y="0" class="mono">${text}</text></g></svg>`;
}
