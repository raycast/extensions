import { useState, useEffect, useRef } from "react";
import { evaluate } from "mathjs";
import { showToast, Toast, Color, LocalStorage } from "@raycast/api";
import {
  parseExpression,
  percentile,
  processDataIntoSegments,
} from "../utils/mathUtils";

import { ThemeColorName } from "../types";

import {
  THEME_COLORS,
  NUM_POINTS,
  INITIAL_X_MIN,
  INITIAL_X_MAX,
  INITIAL_Y_MIN,
  INITIAL_Y_MAX,
  DEFAULT_LINE_COLOR,
} from "../constants";

export function useGraphData(expression: string) {
  const [dataSegments, setDataSegments] = useState<
    { x: number; y: number }[][]
  >([]);
  const [result, setResult] = useState<string | null>(null);
  const [svgRendered, setSvgRendered] = useState<boolean>(false);
  const [lineColor, setLineColor] = useState<string>(DEFAULT_LINE_COLOR);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<Toast | null>(null);

  const [xMin, setXMin] = useState<number>(INITIAL_X_MIN);
  const [xMax, setXMax] = useState<number>(INITIAL_X_MAX);
  const [yMin, setYMin] = useState<number>(INITIAL_Y_MIN);
  const [yMax, setYMax] = useState<number>(INITIAL_Y_MAX);

  const [initialYMin, setInitialYMin] = useState<number>(INITIAL_Y_MIN);
  const [initialYMax, setInitialYMax] = useState<number>(INITIAL_Y_MAX);

  useEffect(() => {
    const loadLineColor = async () => {
      const savedColor = await LocalStorage.getItem<string>("lineColor");
      if (savedColor && THEME_COLORS.includes(savedColor as ThemeColorName)) {
        setLineColor(Color[savedColor as ThemeColorName]);
      } else {
        setLineColor(DEFAULT_LINE_COLOR);
      }
    };
    loadLineColor();
  }, []);

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
        evaluate(expression, { x: 1 });

        const xValues = Array.from(
          { length: NUM_POINTS },
          (_, i) =>
            INITIAL_X_MIN +
            (i / (NUM_POINTS - 1)) * (INITIAL_X_MAX - INITIAL_X_MIN),
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
        { length: NUM_POINTS },
        (_, i) => xMin + (i / (NUM_POINTS - 1)) * (xMax - xMin),
      );
      const yValues = parseExpression(expression, xValues);
      const data = xValues.map((x, i) => ({ x, y: yValues[i] }));
      const dataSegments = processDataIntoSegments(data, yMin, yMax);
      setDataSegments(dataSegments);
      setError(null);
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

  useEffect(() => {
    setSvgRendered(true);
  }, [dataSegments]);

  return {
    dataSegments,
    result,
    svgRendered,
    lineColor,
    error,
    xMin,
    xMax,
    yMin,
    yMax,
    setXMin,
    setXMax,
    setYMin,
    setYMax,
    setLineColor,
    initialXMin: INITIAL_X_MIN,
    initialXMax: INITIAL_X_MAX,
    initialYMin,
    initialYMax,
  };
}
