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

interface GraphProps {
  expression: string;
  onGraphLoaded?: () => void; // New prop for handling graph loaded callback
}

function parseExpression(expression: string, xValues: number[]) {
  return xValues.map((x) => {
    try {
      const result = evaluate(expression, { x });
      if (result === Infinity) {
        return Number.MAX_VALUE;
      } else if (result === -Infinity) {
        return -Number.MAX_VALUE;
      }
      return result;
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
      <svg viewBox="0 0 920 400" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(40,150)">
          <rect
            width="920"
            height="400"
            style={{ fill: "transparent", stroke: "#000000" }}
          />
          <XYPlot width={920} height={400} style={{ color: "#000000" }}>
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

const Graph: React.FC<GraphProps> = ({ expression, onGraphLoaded }) => {
  const [chartData, setChartData] = useState<{ x: number; y: number }[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [svgRendered, setSvgRendered] = useState<boolean>(false);
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
  }, [expression]);

  useEffect(() => {
    if (chartData.length > 0) {
      setSvgRendered(true);
      if (onGraphLoaded) {
        // Call onGraphLoaded callback when graph is loaded
        onGraphLoaded();
      }
    }
  }, [chartData, onGraphLoaded]);

  return (
    <Detail
      markdown={
        result !== null
          ? `## Result\n\n${expression} = ${result}`
          : svgRendered
            ? `## Graph of ${expression}\n\n<img src="data:image/svg+xml;utf8,${encodeURIComponent(
                renderGraphToSVG(expression, chartData),
              )}" alt="Graph" />`
            : ""
      }
    />
  );
};

export default Graph;
