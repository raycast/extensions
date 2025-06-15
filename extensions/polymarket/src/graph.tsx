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
      lineStyle: { width: 3.5 },
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

    // Configure chart options
    const option: EChartsOption = {
      legend: {
        show: true,
        top: "5%",
        textStyle: { fontSize: 30 },
      },
      xAxis: {
        type: "time",
        min: chartXDomain[0],
        max: chartXDomain[1],
        axisLabel: {
          fontSize: 15,
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          },
        },
      },
      yAxis: {
        type: "value",
        min: chartYDomain[0],
        max: chartYDomain[1],
        axisLabel: {
          fontSize: 15,
          formatter: (value: number) => "$" + value.toFixed(2),
        },
      },
      series: seriesData,
      backgroundColor: "transparent",
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
