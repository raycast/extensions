import React, { useEffect, useState, useRef } from "react";
import {
  Color,
  Detail,
  Toast,
  showToast,
  environment,
  ActionPanel,
  Action,
  LocalStorage,
} from "@raycast/api";
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
}

function parseExpression(expression: string, xValues: number[]) {
  try {
    return xValues.map((x) => {
      const result = evaluate(expression, { x });
      if (!isFinite(result)) {
        if (result === Infinity) {
          return Number.MAX_VALUE; // Replace positive infinity
        } else if (result === -Infinity) {
          return -Number.MAX_VALUE; // Replace negative infinity
        } else {
          return NaN; // For other non-finite values like NaN
        }
      }
      return result;
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    throw error; // Throw error to be caught in the calling function
  }
}

// Function to calculate percentiles
function percentile(arr: number[], p: number) {
  if (arr.length === 0) return NaN;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  if (Math.floor(index) === index) {
    return sorted[index];
  } else {
    const i = Math.floor(index);
    const fraction = index - i;
    return sorted[i] + (sorted[i + 1] - sorted[i]) * fraction;
  }
}

function renderGraphToSVG(
  expression: string,
  dataSegments: { x: number; y: number }[][],
  xDomain: [number, number],
  yDomain: [number, number],
  lineColor: string
) {
  try {
    return ReactDOMServer.renderToStaticMarkup(
      <svg viewBox="0 0 800 280" 
      width={800}
      height={280} xmlns="http://www.w3.org/2000/svg">
        <g>
          <XYPlot
            width={800}
            height={280}
            xDomain={xDomain}
            yDomain={yDomain}
            dontCheckIfEmpty={true}
            margin={{right: 0, top: 0, bottom: 20 }}
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
      </svg>
    );
  } catch (error) {
    console.error("SVG rendering error:", error);
    return "";
  }
}

const Graph: React.FC<GraphProps> = ({ expression }) => {
  const [dataSegments, setDataSegments] = useState<
    { x: number; y: number }[][]
  >([]);
  const [result, setResult] = useState<string | null>(null);
  const [svgRendered, setSvgRendered] = useState<boolean>(false);
  const [lineColor, setLineColor] = useState<string>(Color.Yellow);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<Toast | null>(null);

  // State variables for axis boundaries
  const [xMin, setXMin] = useState<number>(-5);
  const [xMax, setXMax] = useState<number>(5);
  const [yMin, setYMin] = useState<number>(-5);
  const [yMax, setYMax] = useState<number>(5);

  // Initial axis boundaries for resetting the view
  const [initialXMin, setInitialXMin] = useState<number>(-5);
  const [initialXMax, setInitialXMax] = useState<number>(5);
  const [initialYMin, setInitialYMin] = useState<number>(-5);
  const [initialYMax, setInitialYMax] = useState<number>(5);

  // Zoom level state variable
  const [zoomLevel, setZoomLevel] = useState<number>(0);
  const maxZoomLevel = 10; // Maximum zoom in steps
  const minZoomLevel = -10; // Maximum zoom out steps

  // Pan level state variables
  const [panXLevel, setPanXLevel] = useState<number>(0);
  const [panYLevel, setPanYLevel] = useState<number>(0);
  const maxPanLevel = 10; // Maximum pan steps in each direction

  // Theme colors
  const themeColors = [
    "Blue",
    "Green",
    "Magenta",
    "Orange",
    "Purple",
    "Red",
    "Yellow",
  ];

  useEffect(() => {
    // Load saved color from local storage or default to Yellow
    const loadLineColor = async () => {
      const savedColor = await LocalStorage.getItem<string>("lineColor");
      if (savedColor && themeColors.includes(savedColor)) {
        setLineColor(Color[savedColor as keyof typeof Color]);
      } else {
        setLineColor(Color.Yellow);
      }
    };
    loadLineColor();
  }, []);

  useEffect(() => {
    const isSimpleEquation =
      /^\s*([-+]?\d+(\.\d+)?\s*([-+*/]\s*([-+]?\d+(\.\d+)?))*)\s*$/.test(
        expression
      );

    const numPoints = 1000; // Increased number of points for smoother graphs

    const initialXMinValue = -5;
    const initialXMaxValue = 5;

    // Reset xMin, xMax, zoomLevel, and pan levels when the expression changes
    setXMin(initialXMinValue);
    setXMax(initialXMaxValue);
    setZoomLevel(0);
    setPanXLevel(0);
    setPanYLevel(0);

    // Set initial xMin and xMax for resetting the view
    setInitialXMin(initialXMinValue);
    setInitialXMax(initialXMaxValue);

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
        setError(null); // Clear any previous errors
        showToast({
          style: Toast.Style.Success,
          title: "Calculation Successful",
          message: `${expression} = ${calculatedResult}`,
        });
      } catch (error) {
        setResult(null);
        setError("Invalid expression. Please check the syntax.");
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
      setResult(null);
      try {
        // Try evaluating the expression at a sample point to check if it's valid
        evaluate(expression, { x: 1 });

        const xValues = Array.from(
          { length: numPoints },
          (_, i) =>
            initialXMinValue +
            (i / (numPoints - 1)) * (initialXMaxValue - initialXMinValue)
        );
        const yValues = parseExpression(expression, xValues);

        // Filter out NaN and infinite values
        const yValuesFiltered = yValues.filter(
          (y) => !isNaN(y) && isFinite(y)
        );

        // Ensure we have valid y-values to calculate yMin and yMax
        if (yValuesFiltered.length === 0) {
          throw new Error("No valid y-values found for the given expression.");
        }

        // Calculate percentiles to exclude outliers
        const lowerPercentile = percentile(yValuesFiltered, 5);
        const upperPercentile = percentile(yValuesFiltered, 95);

        let newYMin = lowerPercentile;
        let newYMax = upperPercentile;

        if (newYMin === newYMax) {
          // Avoid zero range
          newYMin -= 1;
          newYMax += 1;
        }

        setYMin(newYMin);
        setYMax(newYMax);

        // Set initial yMin and yMax for resetting the view
        setInitialYMin(newYMin);
        setInitialYMax(newYMax);

        const data = xValues.map((x, i) => ({ x, y: yValues[i] }));
        // Process data into segments
        const dataSegments = processDataIntoSegments(
          data,
          newYMin,
          newYMax,
          expression
        );
        setDataSegments(dataSegments);
        setError(null); // Clear any previous errors
      } catch (error) {
        console.error("Error in handleComplexExpression:", error);
        setResult(null);
        setError("Invalid expression. Please check the syntax.");
        showToast({
          style: Toast.Style.Failure,
          title: "Evaluation Error",
          message:
            "The expression could not be evaluated. Please check the syntax.",
        });
      } finally {
        closeGeneratingToast();
      }
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

  // Update dataSegments when xMin, xMax, yMin, or yMax changes
  useEffect(() => {
    try {
      // Try evaluating the expression at a sample point to check if it's valid
      evaluate(expression, { x: (xMin + xMax) / 2 });

      const numPoints = 1000; // Increased for better resolution
      const xValues = Array.from(
        { length: numPoints },
        (_, i) => xMin + (i / (numPoints - 1)) * (xMax - xMin)
      );
      const yValues = parseExpression(expression, xValues);
      const data = xValues.map((x, i) => ({ x, y: yValues[i] }));

      // Process data into segments
      const dataSegments = processDataIntoSegments(
        data,
        yMin,
        yMax,
        expression
      );
      setDataSegments(dataSegments);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error updating dataSegments:", error);
      setError("Invalid expression. Please check the syntax.");
      showToast({
        style: Toast.Style.Failure,
        title: "Evaluation Error",
        message:
          "The expression could not be evaluated. Please check the syntax.",
      });
    }
  }, [xMin, xMax, yMin, yMax, expression]);

  // Ensure svgRendered is true even if there are no data points
  useEffect(() => {
    setSvgRendered(true);
  }, [dataSegments]);

  // Function to process data into continuous segments
  function processDataIntoSegments(
    data: { x: number; y: number }[],
    yMin: number,
    yMax: number,
    expression: string
  ) {
    const segments: { x: number; y: number }[][] = [];
    let currentSegment: { x: number; y: number }[] = [];

    const yRange = yMax - yMin;
    const maxDeltaY = yRange * 0.1; // Threshold for detecting discontinuities

    for (let i = 0; i < data.length; i++) {
      const { x, y } = data[i];

      // Check if y is within finite bounds and not at the max/min finite numbers
      if (
        isFinite(y) &&
        y !== Number.MAX_VALUE &&
        y !== -Number.MAX_VALUE
      ) {
        if (currentSegment.length > 0) {
          const lastPoint = currentSegment[currentSegment.length - 1];
          const deltaY = Math.abs(y - lastPoint.y);
          if (deltaY > maxDeltaY) {
            // Discontinuity detected, start a new segment
            segments.push(currentSegment);
            currentSegment = [];
          }
        }
        currentSegment.push({ x, y });
      } else {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        // Handle infinite values by adding a point at yMax or yMin
        if (y === Number.MAX_VALUE || y === -Number.MAX_VALUE) {
          //const clampedY = y === Number.MAX_VALUE ? yMax : yMin;
          currentSegment.push({ x, y });
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }

  // Navigation actions
  const zoomFactor = 0.8;
  const panFactor = 0.3;

  const zoomIn = () => {
    if (zoomLevel >= maxZoomLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Zoom In Level Reached",
        message: "You cannot zoom in any further.",
      });
      return;
    }

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const newXMin = xMin + (xRange * (1 - zoomFactor)) / 2;
    const newXMax = xMax - (xRange * (1 - zoomFactor)) / 2;
    const newYMin = yMin + (yRange * (1 - zoomFactor)) / 2;
    const newYMax = yMax - (yRange * (1 - zoomFactor)) / 2;
    setXMin(newXMin);
    setXMax(newXMax);
    setYMin(newYMin);
    setYMax(newYMax);
    setZoomLevel(zoomLevel + 1);

  };

  const zoomOut = () => {
    if (zoomLevel <= minZoomLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Zoom Out Level Reached",
        message: "You cannot zoom out any further.",
      });
      return;
    }

    const zoomOutFactor = 1 / zoomFactor;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const newXMin = xMin - (xRange * (zoomOutFactor - 1)) / 2;
    const newXMax = xMax + (xRange * (zoomOutFactor - 1)) / 2;
    const newYMin = yMin - (yRange * (zoomOutFactor - 1)) / 2;
    const newYMax = yMax + (yRange * (zoomOutFactor - 1)) / 2;
    setXMin(newXMin);
    setXMax(newXMax);
    setYMin(newYMin);
    setYMax(newYMax);
    setZoomLevel(zoomLevel - 1);
  };

  const moveLeft = () => {
    if (panXLevel <= -maxPanLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Left Pan Reached",
        message: "You cannot pan left any further.",
      });
      return;
    }

    const xRange = xMax - xMin;
    const deltaX = xRange * panFactor;
    setXMin(xMin - deltaX);
    setXMax(xMax - deltaX);
    setPanXLevel(panXLevel - 1);
  };

  const moveRight = () => {
    if (panXLevel >= maxPanLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Right Pan Reached",
        message: "You cannot pan right any further.",
      });
      return;
    }

    const xRange = xMax - xMin;
    const deltaX = xRange * panFactor;
    setXMin(xMin + deltaX);
    setXMax(xMax + deltaX);
    setPanXLevel(panXLevel + 1);
  };

  const moveUp = () => {
    if (panYLevel >= maxPanLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Upward Pan Reached",
        message: "You cannot pan up any further.",
      });
      return;
    }

    const yRange = yMax - yMin;
    const deltaY = yRange * panFactor;
    setYMin(yMin + deltaY);
    setYMax(yMax + deltaY);
    setPanYLevel(panYLevel + 1);
  };

  const moveDown = () => {
    if (panYLevel <= -maxPanLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Downward Pan Reached",
        message: "You cannot pan down any further.",
      });
      return;
    }

    const yRange = yMax - yMin;
    const deltaY = yRange * panFactor;
    setYMin(yMin - deltaY);
    setYMax(yMax - deltaY);
    setPanYLevel(panYLevel - 1);
  };

  // Reset View function
  const resetView = () => {
    setXMin(initialXMin);
    setXMax(initialXMax);
    setYMin(initialYMin);
    setYMax(initialYMax);
    setZoomLevel(0);
    setPanXLevel(0);
    setPanYLevel(0);
    showToast({
      style: Toast.Style.Success,
      title: "View Reset",
      message: "Graph view has been reset to the default settings.",
    });
  };

  // Cycle Theme Color function
  const cycleThemeColor = async () => {
    const currentIndex = themeColors.findIndex(
      (color) => Color[color as keyof typeof Color] === lineColor
    );
    const nextIndex = (currentIndex + 1) % themeColors.length;
    const nextColorName = themeColors[nextIndex];
    const nextColor = Color[nextColorName as keyof typeof Color] as string;
    setLineColor(nextColor);
    await LocalStorage.setItem("lineColor", nextColorName);
    showToast({
      style: Toast.Style.Success,
      title: "Theme Color Changed",
      message: `Graph line color changed to ${nextColorName}.`,
    });
  };

  return (
    <Detail
      markdown={
        error
          ? `## Error\n\n${error}`
          : result !== null
          ? `\\[${expression} = ${result}\\]`
          : svgRendered
          ? `\\begin{math}${expression}\\end{math}\n\n<img src="data:image/svg+xml;utf8,${encodeURIComponent(
              renderGraphToSVG(
                expression,
                dataSegments,
                [xMin, xMax],
                [yMin, yMax],
                lineColor
              )
            )}?color=${encodeURIComponent(lineColor)}&t=${
              environment.appearance
            }-${lineColor}" alt="Graph" />`
          : `\\begin{math}${expression}\\end{math}\n\n`
      }
      actions={
        !error && result === null && (
          <ActionPanel>
            <Action title="Zoom In" onAction={zoomIn} />
            <Action title="Zoom Out" onAction={zoomOut} />
            <Action
              title="Move Up"
              onAction={moveUp}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
            />
            <Action
              title="Move Down"
              onAction={moveDown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
            />
            <Action
              title="Move Left"
              onAction={moveLeft}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
            />
            <Action
              title="Move Right"
              onAction={moveRight}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
            />
            <Action
              title="Reset View"
              onAction={resetView}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action
              title="Change Theme Color"
              onAction={cycleThemeColor}
              shortcut={{ modifiers: ["cmd", "shift"], key: ";" }}
            />
          </ActionPanel>
        )
      }
    />
  );
};

export default Graph;
