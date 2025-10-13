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

export function TokenSvg({ clipboard, showToken, showLogo, showDetail, section, definition }: TokenSvgProps) {
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
  return (
    <svg viewBox="0 0 700 1000" xmlns="http://www.w3.org/2000/svg">
      <style>
        {[
          ".mono  { font-family: Menlo; font-size: 8px; }",
          `.title { font-family: Helvetica; font-size: 7px }`,
          `.main  { fill: ${titleColor}; }`,
          `.sub   { fill: ${subColor}; }`,
          `.head  { fill: ${headColor}; ${section === "head" ? "font-weight: bold; " : ""}}`,
          `.data  { fill: ${dataColor}; ${section === "data" ? "font-weight: bold; " : ""}}`,
          `.foot  { fill: ${footColor}; }`,
        ].join("\n")}
      </style>
      <g>
        {showToken && showDetail && <path d="M286,-10 L286,230 Z" stroke="rgb(151,151,151)" strokeWidth={0.25} />}
        <text x={0} y={0} className="mono">
          {/* DECODED DATA */}
          {showDetail && (
            <>
              <tspan className="title main" x={dTextOffset} y={textLineStandardOffset}>
                HEADER:{" "}
              </tspan>
              <tspan className="title sub" dx={0} dy={0}>
                ALGORITHM & TOKEN TYPE
              </tspan>
              <tspan className="head" x={dTextOffset} dy={textLineHeight - textLineStandardOffset}>
                {"{" + " ".repeat(showToken ? textWidth - 1 : textWidthWide - 1)}
              </tspan>
              {headJSON.slice(1).map((item, id) => (
                <tspan key={id} className="head" x={dTextOffset} dy={textLineHeight}>
                  {displayValue(item, undefined, showToken)}
                </tspan>
              ))}
              <tspan className="title main" x={dTextOffset} dy={textLineHeight + textLineStandardOffset}>
                PAYLOAD:{" "}
              </tspan>
              <tspan className="title sub" dx={0} dy={0}>
                DATA
              </tspan>
              {bodyJSON.map((item, id) => (
                <tspan key={id} className="data" x={dTextOffset} dy={textLineHeight}>
                  {displayValue(item, undefined, showToken)}
                </tspan>
              ))}
              <tspan x={dTextOffset} dy={textLineHeight} />
            </>
          )}
          {/* DEFINITION */}
          {definition && (
            <>
              <tspan x={textOffSet} y={0} className="mono main">
                {definition.key}:{" "}
              </tspan>
              <tspan dx={0} dy={0} className="mono data">
                {displayValue(definition.value, definition.key, showToken)}
              </tspan>
              {definitionRow.map((row, i) => (
                <tspan key={i} x={textOffSet} dy={textLineHeight} className="mono sub">
                  {row}
                </tspan>
              ))}
              {definitionRow.length == 0 && <tspan x={textOffSet} dy={textLineHeight} />}
              {definitionRow.length <= 1 && <tspan x={textOffSet} dy={textLineHeight} />}
            </>
          )}
          {/* TOKEN PARTS */}
          {showToken && (
            <>
              {head &&
                head.map((row, i) => (
                  <tspan
                    key={i}
                    x={textOffSet}
                    dy={i == 0 && !definition ? 0 : textLineHeight}
                    y={i == 0 && !definition ? 0 : undefined}
                    className="mono head"
                  >
                    {row}
                  </tspan>
                ))}
              <tspan dx={0} dy={0}>
                .
              </tspan>
              {data &&
                data.map((row, i) => (
                  <tspan
                    key={i}
                    x={i == 0 ? undefined : textOffSet}
                    dx="0"
                    dy={i == 0 ? 0 : textLineHeight}
                    className="mono data"
                  >
                    {row}
                  </tspan>
                ))}
              <tspan dx={0} dy={0}>
                .
              </tspan>
              {foot &&
                foot.map((row, i) => {
                  return (
                    <tspan
                      key={i}
                      x={i == 0 ? undefined : textOffSet}
                      dx="0"
                      dy={i == 0 ? 0 : textLineHeight}
                      className="mono foot"
                    >
                      {row}
                    </tspan>
                  );
                })}
              <tspan x={textOffSet} dy={textLineHeight} />
            </>
          )}
        </text>
      </g>
      {showLogo && (
        <g transform="translate(22, -5)">
          <g transform="scale(0.1)">
            <path
              d="M221.079 103.296L220.694 0H162.921L163.306 103.296L192.193 142.848L221.079 103.296Z"
              fill="rgb(255, 255, 255)"
            />
            <path d="M163.306 280.32V384H221.079V280.32L192.193 240.768L163.306 280.32Z" fill="rgb(255, 255, 255)" />
            <path
              d="M221.079 280.32L281.934 364.032L328.538 330.24L267.683 246.528L221.079 231.552V280.32Z"
              fill="rgb(0, 242, 230)"
            />
            <path
              d="M163.306 103.296L102.066 19.584L55.4625 53.376L116.317 137.088L163.306 152.064V103.296Z"
              fill="rgb(0, 242, 230)"
            />
            <path
              d="M116.317 137.088L17.7172 105.216L0 159.744L98.5998 192L145.204 176.64L116.317 137.088Z"
              fill="rgb(0, 185, 241)"
            />
            <path
              d="M238.796 206.976L267.683 246.528L366.283 278.4L384 223.872L285.4 192L238.796 206.976Z"
              fill="rgb(0, 185, 241)"
            />
            <path
              d="M285.4 192L384 159.744L366.283 105.216L267.683 137.088L238.796 176.64L285.4 192Z"
              fill="rgb(214, 58, 255)"
            />
            <path
              d="M98.5998 192L0 223.872L17.7172 278.4L116.317 246.528L145.204 206.976L98.5998 192Z"
              fill="rgb(214, 58, 255)"
            />
            <path
              d="M116.317 246.528L55.4625 330.24L102.066 364.032L163.306 280.32V231.552L116.317 246.528Z"
              fill="rgb(251, 1, 91)"
            />
            <path
              d="M267.683 137.088L328.538 53.376L281.934 19.584L221.079 103.296V152.064L267.683 137.088Z"
              fill="rgb(251, 1, 91)"
            />
          </g>
        </g>
      )}
    </svg>
  );
}
