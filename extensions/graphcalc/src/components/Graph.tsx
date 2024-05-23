import React, { useEffect, useState, useRef } from "react";
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
    } catch (error) {
      console.error("Evaluation error:", error);
      return NaN;
    }
  });
}

function renderGraphToSVG(
  expression: string,
  chartData: { x: number; y: number }[],
) {
  try {
    return ReactDOMServer.renderToStaticMarkup(
      <svg viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(40,150)">
          <rect
            width="920"
            height="500"
            style={{ fill: "transparent", stroke: "#000000" }}
          />
          <XYPlot width={900} height={500} style={{ color: "#000000" }}>
            <HorizontalGridLines style={{ stroke: "#e0e0e0" }} />
            <VerticalGridLines style={{ stroke: "#e0e0e0" }} />
            <XAxis style={{ stroke: "#777777" }} />
            <YAxis style={{ stroke: "#777777" }} />
            <LineSeries
              data={chartData}
              style={{ stroke: "#F5B041", strokeWidth: 2, fill: "transparent" }}
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
  const toastRef = useRef<Toast | null>(null);

  useEffect(() => {
    const isSimpleEquation =
      /^\s*([-+]?\d+(\.\d+)?\s*([-+*/]\s*([-+]?\d+(\.\d+)?))*)\s*$/.test(
        expression,
      );
    const xValues = Array.from({ length: 100 }, (_, i) => (i - 50) / 10);
    const yValues = parseExpression(expression, xValues);
    const data = xValues.map((x, i) => ({ x, y: yValues[i] }));

    const showGeneratingToast = async () => {
      const newToast = await showToast({
        style: Toast.Style.Animated,
        title: "Generating Chart",
        message: `Rendering graph for the expression: ${expression}`,
      });
      toastRef.current = newToast;
    };

    const closeGeneratingToast = () => {
      if (toastRef.current) {
        toastRef.current.hide();
        toastRef.current = null;
      }
    };

    const handleSimpleEquation = () => {
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
    };

    const handleComplexExpression = async () => {
      await showGeneratingToast();
      setChartData(data);
      setResult(null);
      setHistory((prevHistory) => [...prevHistory, expression]);
      closeGeneratingToast();
    };

    if (isSimpleEquation) {
      handleSimpleEquation();
    } else {
      handleComplexExpression();
    }

    return () => {
      closeGeneratingToast();
    };
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
