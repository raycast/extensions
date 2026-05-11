import { evaluate } from "mathjs";
import { DataPoint } from "../types";

export function parseExpression(expression: string, xValues: number[]) {
  try {
    return xValues.map((x) => {
      const result = evaluate(expression, { x });
      if (!isFinite(result)) {
        if (result === Infinity) {
          return Number.MAX_VALUE;
        } else if (result === -Infinity) {
          return -Number.MAX_VALUE;
        } else {
          return NaN;
        }
      }
      // Notice that MAX_VALUE and -MAX_VALUE will be filtered out in the processDataIntoSegments
      // In the future, we can calculate more points to avoid blanks or print an arrow indicating the direction.
      return result;
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    throw error;
  }
}

export function percentile(arr: number[], p: number) {
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

export function processDataIntoSegments(
  data: DataPoint[],
  yMin: number,
  yMax: number,
) {
  const segments: DataPoint[][] = [];
  let currentSegment: DataPoint[] = [];

  const yRange = yMax - yMin;
  const maxDeltaY = yRange * 0.1;

  for (let i = 0; i < data.length; i++) {
    const { x, y } = data[i];

    if (isFinite(y) && y !== Number.MAX_VALUE && y !== -Number.MAX_VALUE) {
      if (currentSegment.length > 0) {
        const lastPoint = currentSegment[currentSegment.length - 1];
        const deltaY = Math.abs(y - lastPoint.y);
        if (deltaY > maxDeltaY) {
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
      if (y === Number.MAX_VALUE || y === -Number.MAX_VALUE) {
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
