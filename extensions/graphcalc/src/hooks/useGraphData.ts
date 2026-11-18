import { useState, useEffect, useRef } from "react";
import { evaluate } from "mathjs";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  parseExpression,
  percentile,
  processDataIntoSegments,
} from "../utils/mathUtils";

import {
  INITIAL_X_MIN,
  INITIAL_X_MAX,
  INITIAL_Y_MIN,
  INITIAL_Y_MAX,
} from "../constants";
import { getPlotPoints } from "../lib/preferences";

export function useGraphData(expression: string) {
  // Preferences can't change while the command is open; read once per mount.
  const [numPoints] = useState<number>(getPlotPoints);
  const [dataSegments, setDataSegments] = useState<
    { x: number; y: number }[][]
  >([]);
  const [result, setResult] = useState<string | null>(null);
  const [svgRendered, setSvgRendered] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<Toast | null>(null);

  const [xMin, setXMin] = useState<number>(INITIAL_X_MIN);
  const [xMax, setXMax] = useState<number>(INITIAL_X_MAX);
  const [yMin, setYMin] = useState<number>(INITIAL_Y_MIN);
  const [yMax, setYMax] = useState<number>(INITIAL_Y_MAX);

  const [initialYMin, setInitialYMin] = useState<number>(INITIAL_Y_MIN);
  const [initialYMax, setInitialYMax] = useState<number>(INITIAL_Y_MAX);

  useEffect(() => {
    const isSimpleEquation =
      /^\s*([-+]?\d+(\.\d+)?\s*([-+*/]\s*([-+]?\d+(\.\d+)?))*)\s*$/.test(
        expression,
      );

    setXMin(INITIAL_X_MIN);
    setXMax(INITIAL_X_MAX);

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
        setError(null);
        showToast({
          style: Toast.Style.Success,
          title: "Calculation Successful",
          message: `${expression} = ${calculatedResult}`,
        });
      } catch (error) {
        setResult(null);
        setError("Invalid expression. Please check the syntax and try again.");
        showFailureToast(error, { title: "Calculation Error" });
      }
    };

    const handleComplexExpression = async () => {
      await showGeneratingToast();
      setResult(null);
      try {
        evaluate(expression, { x: 1 });

        const xValues = Array.from(
          { length: numPoints },
          (_, i) =>
            INITIAL_X_MIN +
            (i / (numPoints - 1)) * (INITIAL_X_MAX - INITIAL_X_MIN),
        );
        const yValues = parseExpression(expression, xValues);

        const yValuesFiltered = yValues.filter((y) => !isNaN(y) && isFinite(y));

        if (yValuesFiltered.length === 0) {
          throw new Error("No valid y-values found for the given expression.");
        }

        // Calculate percentiles to exclude outliers
        // We should recalculate values between the last valid point, the next valid point or both to avoid discontinuity.
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

        setInitialYMin(newYMin);
        setInitialYMax(newYMax);

        const data = xValues.map((x, i) => ({ x, y: yValues[i] }));
        const dataSegments = processDataIntoSegments(data, newYMin, newYMax);
        setDataSegments(dataSegments);
      } catch (error) {
        console.error("Error in handleComplexExpression:", error);
        setResult(null);
        setError("Invalid expression. Please check the syntax and try again.");
        showFailureToast(error, { title: "Evaluation Error" });
      } finally {
        closeGeneratingToast();
      }
      setError(null);
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
    try {
      evaluate(expression, { x: (xMin + xMax) / 2 });

      const xValues = Array.from(
        { length: numPoints },
        (_, i) => xMin + (i / (numPoints - 1)) * (xMax - xMin),
      );
      const yValues = parseExpression(expression, xValues);
      const data = xValues.map((x, i) => ({ x, y: yValues[i] }));
      const dataSegments = processDataIntoSegments(data, yMin, yMax);
      setDataSegments(dataSegments);
      setError(null);
    } catch (error) {
      console.error("Error updating dataSegments:", error);
      setError("Invalid expression. Please check the syntax and try again.");
      showFailureToast(error, { title: "Evaluation Error" });
    }
  }, [xMin, xMax, yMin, yMax, expression]);

  useEffect(() => {
    setSvgRendered(true);
  }, [dataSegments]);

  return {
    dataSegments,
    result,
    svgRendered,
    error,
    xMin,
    xMax,
    yMin,
    yMax,
    setXMin,
    setXMax,
    setYMin,
    setYMax,
    initialXMin: INITIAL_X_MIN,
    initialXMax: INITIAL_X_MAX,
    initialYMin,
    initialYMax,
  };
}
