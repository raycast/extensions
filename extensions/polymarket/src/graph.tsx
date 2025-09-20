import { DataPoint } from "./types";
import * as echarts from "echarts";
import { EChartsOption } from "echarts";

/**
 * Chart rendering to generate SVG markup to be embedded in Raycast.
 *
 * This module uses ECharts for rendering, converting time-series data into SVG format.
 * The generated SVG can then base64-encoded and embedded in markdown image tags,
 * so that a chart can be directly embedded in Raycast Detail views.
 * Inspiration for this came from:
 * https://www.raycast.com/conner_luzier/graphcalc
 */
function renderGraphToSVG(
  series: { name: string; data: DataPoint[] }[],
  xDomain: [number | null, number | null],
  yDomain: [number | null, number | null],
): string {
  try {
    // Convert data for ECharts format
    const seriesData = series.map(({ name, data }) => ({
      name,
      type: "line" as const,
      smooth: true,
      symbol: "none",
      data: data.map((point) => [point.x, point.y]),
      lineStyle: { width: 4 },
    }));

    // Validate data
    if (series.length === 0 || series.every((segment) => segment.data.length === 0)) {
      return "Error: No data points provided for chart rendering.";
    }

    const allXValues = series.flatMap((segment) => segment.data.map((point) => point.x));
    const allYValues = series.flatMap((segment) => segment.data.map((point) => point.y));

    if (allXValues.length === 0) {
      return "Error: Not enough data points to determine chart domains.";
    }

    // Calculate domains (auto if null)
    const chartXDomain: [number, number] = [
      xDomain[0] ?? Math.min(...allXValues),
      xDomain[1] ?? Math.max(...allXValues),
    ];

    const chartYDomain: [number, number] = [
      yDomain[0] ?? Math.min(...allYValues),
      yDomain[1] ?? Math.max(...allYValues),
    ];

    // Configure chart options with improved styling
    const option: EChartsOption = {
      grid: {
        left: "3%",
        right: "3%",
        top: "5%",
        bottom: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "time",
        min: chartXDomain[0],
        max: chartXDomain[1],
        axisLine: {
          lineStyle: { color: "#666666", width: 2 },
        },
        axisTick: {
          lineStyle: { color: "#666666", width: 1 },
        },
        axisLabel: {
          fontSize: 33,
          color: "#ffffff",
          fontWeight: "bold",
          margin: 25,
          formatter: (value: number | string | { value: number }) => {
            // Handle different value types and ensure proper date formatting
            let timestamp: number;

            if (typeof value === "number") {
              timestamp = value;
            } else if (typeof value === "string") {
              timestamp = parseInt(value);
            } else if (value && typeof value === "object" && value.value !== undefined) {
              timestamp = value.value;
            } else {
              return "Invalid Date";
            }

            // Check if timestamp is valid
            if (isNaN(timestamp) || timestamp <= 0) {
              return "Invalid Date";
            }

            // Convert from seconds to milliseconds if timestamp is small (Unix epoch in seconds)
            if (timestamp < 10000000000) {
              // Less than year 2286 in seconds
              timestamp = timestamp * 1000;
            }

            try {
              const date = new Date(timestamp);

              if (isNaN(date.getTime())) {
                return "Invalid Date";
              }

              // Format the date properly
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            } catch (error) {
              return "Error";
            }
          },
        },
        splitLine: {
          show: true,
          lineStyle: { color: "#444444", width: 1, type: "dashed" },
        },
      },
      yAxis: {
        type: "value",
        min: chartYDomain[0],
        max: chartYDomain[1],
        axisLine: {
          lineStyle: { color: "#666666", width: 2 },
        },
        axisTick: {
          lineStyle: { color: "#666666", width: 1 },
        },
        axisLabel: {
          fontSize: 18,
          color: "#ffffff",
          fontWeight: "bold",
          formatter: (value: number) => "$" + value.toFixed(2),
        },
        splitLine: {
          show: true,
          lineStyle: { color: "#444444", width: 1, type: "dashed" },
        },
      },
      series: seriesData,
      backgroundColor: "transparent",
      color: ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "#666666",
        textStyle: {
          color: "#ffffff",
          fontSize: 14,
        },
      },
    };

    // Render SVG
    const chart = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: "800",
      height: "600",
    });

    chart.setOption(option);
    const svgMarkup = chart.renderToSVGString();
    chart.dispose();

    return svgMarkup;
  } catch (error) {
    return `Failed to render chart: ${JSON.stringify(error)}`;
  }
}

export { renderGraphToSVG };
