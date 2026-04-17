import * as echarts from "echarts";
import type { LinkClicksByDay, TimeSeriesPoint } from "../types";

export function renderLinkChart(data: LinkClicksByDay[]): string {
  if (!data.length) return "";
  return renderLineChart(
    data.map((d) => d.date),
    [{ name: "Clicks", data: data.map((d) => d.clicks), color: "#5B7FFF" }],
  );
}

export function renderChart(data: TimeSeriesPoint[]): string {
  if (!data.length) return "";

  return renderLineChart(
    data.map((d) => d.date),
    [
      { name: "Visitors", data: data.map((d) => d.visitors), color: "#5B7FFF" },
      { name: "Page Views", data: data.map((d) => d.pageviews), color: "#A855F7" },
    ],
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderLineChart(dates: string[], series: { name: string; data: number[]; color: string }[]): string {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width: 800, height: 400 });

  chart.setOption({
    backgroundColor: "transparent",
    grid: { left: "8%", right: "4%", top: "12%", bottom: "14%", containLabel: true },
    legend: {
      top: 0,
      textStyle: { color: "#aaa", fontSize: 13 },
      itemWidth: 16,
      itemHeight: 3,
    },
    xAxis: {
      type: "category",
      data: dates.map((d) => {
        const date = new Date(d);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
      axisLine: { lineStyle: { color: "#555" } },
      axisLabel: { color: "#aaa", fontSize: 11, interval: Math.max(0, Math.floor(dates.length / 7) - 1) },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#333", type: "dashed" } },
      axisLine: { show: false },
      axisLabel: { color: "#aaa", fontSize: 11 },
    },
    series: series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: true,
      symbol: "none",
      data: s.data,
      lineStyle: { width: 3, color: s.color },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: hexToRgba(s.color, 0.3) },
          { offset: 1, color: hexToRgba(s.color, 0.02) },
        ]),
      },
    })),
  });

  const svg = chart.renderToSVGString();
  chart.dispose();
  const base64 = Buffer.from(svg).toString("base64");
  return `![Analytics](data:image/svg+xml;base64,${base64})`;
}
