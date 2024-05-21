import React, { useEffect, useState } from "react";
import { Detail, Toast, showToast } from "@raycast/api";
import { evaluate } from "mathjs";
import {
  XYPlot,
  XAxis,
  YAxis,
  HorizontalGridLines,
  VerticalGridLines,
  LineSeries,
} from "react-vis";
import ReactDOMServer from "react-dom/server";
import "react-vis/dist/style.css";

function parseExpression(expression: string, xValues: number[]) {
  return xValues.map((x) => {
    try {
      return evaluate(expression, { x });
    } catch {
      return NaN;
    }
  });
}

function renderGraphToSVG(
  expression: string,
  chartData: { x: number; y: number }[],
) {
  return ReactDOMServer.renderToStaticMarkup(
    <svg viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(40,40)">
        <rect width="920" height="720" fill="transparent" />
        <XYPlot width={920} height={720}>
          <HorizontalGridLines />
          <VerticalGridLines />
          <XAxis />
          <YAxis />
          <LineSeries
            data={chartData}
            style={{ stroke: "blue", strokeWidth: 2, fill: "transparent" }}
          />
        </XYPlot>
      </g>
    </svg>,
  );
}

export default function Graph({
  expression,
  history,
  setHistory,
}: {
  expression: string;
  history: string[];
  setHistory: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [chartData, setChartData] = useState<{ x: number; y: number }[]>([]);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const isSimpleEquation =
      /^\s*([-+]?\d+(\.\d+)?\s*([-+*/]\s*([-+]?\d+(\.\d+)?))*)\s*$/.test(
        expression,
      );
    const xValues = Array.from({ length: 100 }, (_, i) => (i - 50) / 10);
    const yValues = parseExpression(expression, xValues);
    const data = xValues.map((x, i) => ({ x, y: yValues[i] }));

    if (isSimpleEquation) {
      try {
        const calculatedResult = evaluate(expression);
        setResult(calculatedResult.toString());
        setHistory((prevHistory) => [
          ...prevHistory,
          `${expression} = ${calculatedResult.toString()}`,
        ]);
        showToast({
          style: Toast.Style.Success,
          title: "Calculation Successful",
          message: `${expression} = ${calculatedResult}`,
        });
      } catch (error) {
        setResult("Error: Invalid expression");
        showToast({
          style: Toast.Style.Failure,
          title: "Calculation Error",
          message:
            "The expression could not be evaluated. Please check the syntax.",
        });
      }
    } else {
      setChartData(data);
      setResult(null);
      setHistory((prevHistory) => [...prevHistory, expression]);
      showToast({
        style: Toast.Style.Animated,
        title: "Generating Chart",
        message: `Rendering graph for the expression: ${expression}`,
      });
    }
  }, [expression, setHistory]);

  return (
    <Detail
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current" text={expression} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="History">
            {history.map((expr, index) => (
              <Detail.Metadata.TagList.Item key={index} text={expr} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      markdown={
        result !== null
          ? `## Result\n\n${expression} = ${result}`
          : chartData.length > 0
            ? `## Graph of ${expression}\n\n<img src="data:image/svg+xml;utf8,${encodeURIComponent(
                renderGraphToSVG(expression, chartData),
              )}" alt="Graph" />`
            : "Generating chart..."
      }
    />
  );
}
