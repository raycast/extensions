import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  XYPlot,
  XAxis,
  YAxis,
  HorizontalGridLines,
  VerticalGridLines,
  LineSeries,
} from "react-vis";
import { Color } from "@raycast/api";
import { DataPoint } from "../types";

export function renderGraphToSVG(
  expression: string,
  dataSegments: DataPoint[][],
  xDomain: [number, number],
  yDomain: [number, number],
  lineColor: string,
) {
  try {
    return ReactDOMServer.renderToStaticMarkup(
      <svg
        viewBox="0 0 800 280"
        width={800}
        height={280}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <XYPlot
            width={800}
            height={280}
            xDomain={xDomain}
            yDomain={yDomain}
            dontCheckIfEmpty={true}
            margin={{ right: 0, top: 0, bottom: 20 }}
          >
            <HorizontalGridLines style={{ stroke: Color.SecondaryText }} />
            <VerticalGridLines style={{ stroke: Color.SecondaryText }} />
            {dataSegments.map((segment, index) => (
              <LineSeries
                key={index}
                data={segment}
                style={{
                  stroke: lineColor,
                  strokeWidth: 3,
                  fill: "transparent",
                }}
              />
            ))}
            <XAxis
              style={{
                line: { stroke: Color.PrimaryText },
                ticks: { stroke: Color.PrimaryText },
                text: { fill: Color.PrimaryText },
              }}
            />
            <YAxis
              style={{
                line: { stroke: Color.PrimaryText },
                ticks: { stroke: Color.PrimaryText },
                text: { fill: Color.PrimaryText },
              }}
            />
          </XYPlot>
        </g>
      </svg>,
    );
  } catch (error) {
    console.error("SVG rendering error:", error);
    return "";
  }
}
