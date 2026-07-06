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
  showLogo?: boolean;
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

const logo = `<g transform="translate(22, -5)"><g transform="scale(0.1)"><path d="M221.079 103.296L220.694 0H162.921L163.306 103.296L192.193 142.848L221.079 103.296Z" fill="rgb(255, 255, 255)"/><path d="M163.306 280.32V384H221.079V280.32L192.193 240.768L163.306 280.32Z" fill="rgb(255, 255, 255)"/><path d="M221.079 280.32L281.934 364.032L328.538 330.24L267.683 246.528L221.079 231.552V280.32Z" fill="rgb(0, 242, 230)"/><path d="M163.306 103.296L102.066 19.584L55.4625 53.376L116.317 137.088L163.306 152.064V103.296Z" fill="rgb(0, 242, 230)"/><path d="M116.317 137.088L17.7172 105.216L0 159.744L98.5998 192L145.204 176.64L116.317 137.088Z" fill="rgb(0, 185, 241)"/><path d="M238.796 206.976L267.683 246.528L366.283 278.4L384 223.872L285.4 192L238.796 206.976Z" fill="rgb(0, 185, 241)"/><path d="M285.4 192L384 159.744L366.283 105.216L267.683 137.088L238.796 176.64L285.4 192Z" fill="rgb(214, 58, 255)"/><path d="M98.5998 192L0 223.872L17.7172 278.4L116.317 246.528L145.204 206.976L98.5998 192Z" fill="rgb(214, 58, 255)"/><path d="M116.317 246.528L55.4625 330.24L102.066 364.032L163.306 280.32V231.552L116.317 246.528Z" fill="rgb(251, 1, 91)"/><path d="M267.683 137.088L328.538 53.376L281.934 19.584L221.079 103.296V152.064L267.683 137.088Z" fill="rgb(251, 1, 91)"/></g></g>`;

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
  showLogo,
  showDetail,
  section,
  definition,
}: TokenSvgProps): string {
  const bits = clipboard.split(".");
  const headJSON = partToJsonStringArray(bits[0]);
  const bodyJSON = partToJsonStringArray(bits[1]);
  const head = bits[0].match(twRegex);
  const hOffset = textWidth - 1 - (head ?? [""]).slice(-1)[0].length;
  const data = [bits[1].substring(0, hOffset), ...(bits[1].substring(hOffset).match(twRegex) ?? [])];
  const dOffset = textWidth - 1 - data.slice(-1)[0].length;
  const definitionRow = definition?.row ? definition.row[1].match(twRegex) || [] : [];
  const foot = [bits[2].substring(0, dOffset), ...(bits[2].substring(dOffset).match(twRegex) ?? [])];
  const dTextOffset = showToken ? dataTextOffset : textOffSet;

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
        tspan({ class: "head", x: dTextOffset, dy: textLineHeight }, displayValue(item, undefined, showToken)),
      )
      .join("");
    text += tspan({ class: "title main", x: dTextOffset, dy: textLineHeight + textLineStandardOffset }, "PAYLOAD: ");
    text += tspan({ class: "title sub", dx: 0, dy: 0 }, "DATA");
    text += bodyJSON
      .map((item) =>
        tspan({ class: "data", x: dTextOffset, dy: textLineHeight }, displayValue(item, undefined, showToken)),
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
              x: textOffSet,
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
          { x: i == 0 ? undefined : textOffSet, dx: "0", dy: i == 0 ? 0 : textLineHeight, class: "mono data" },
          row,
        ),
      )
      .join("");
    text += tspan({ dx: 0, dy: 0 }, ".");
    text += foot
      .map((row, i) =>
        tspan(
          { x: i == 0 ? undefined : textOffSet, dx: "0", dy: i == 0 ? 0 : textLineHeight, class: "mono foot" },
          row,
        ),
      )
      .join("");
    text += tspan({ x: textOffSet, dy: textLineHeight });
  }

  const divider =
    showToken && showDetail ? `<path d="M286,-10 L286,230 Z" stroke="rgb(151,151,151)" stroke-width="0.25"/>` : "";

  return `<svg viewBox="0 0 700 1000" xmlns="http://www.w3.org/2000/svg"><style>${style}</style><g>${divider}<text x="0" y="0" class="mono">${text}</text></g>${showLogo ? logo : ""}</svg>`;
}
