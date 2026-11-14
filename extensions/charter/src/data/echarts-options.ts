import type { EchartsOption } from "../lib/catalog";

/**
 * One complete option per catalog type ECharts can draw. Small, static, no
 * functions, so each one is a template to copy as JSON, a prompt example and
 * a thumbnail. The page sets a transparent background and turns animation off.
 */
export const ECHARTS_OPTIONS = {
  sankey: {
    series: [
      {
        type: "sankey",
        emphasis: { focus: "adjacency" },
        data: [
          { name: "Budget" },
          { name: "Rent" },
          { name: "Food" },
          { name: "Savings" },
          { name: "ISA" },
          { name: "Cash" },
        ],
        links: [
          { source: "Budget", target: "Rent", value: 1200 },
          { source: "Budget", target: "Food", value: 600 },
          { source: "Budget", target: "Savings", value: 400 },
          { source: "Savings", target: "ISA", value: 300 },
          { source: "Savings", target: "Cash", value: 100 },
        ],
      },
    ],
  },
  chord: {
    series: [
      {
        type: "chord",
        data: [{ name: "Design" }, { name: "Build" }, { name: "Test" }, { name: "Ship" }],
        links: [
          { source: "Design", target: "Build", value: 30 },
          { source: "Build", target: "Test", value: 25 },
          { source: "Test", target: "Build", value: 12 },
          { source: "Test", target: "Ship", value: 18 },
          { source: "Ship", target: "Design", value: 8 },
        ],
      },
    ],
  },
  network: {
    series: [
      {
        type: "graph",
        layout: "force",
        roam: false,
        label: { show: true },
        force: { repulsion: 400, edgeLength: 90 },
        symbolSize: 36,
        data: [
          { name: "Web" },
          { name: "API" },
          { name: "Auth" },
          { name: "Queue" },
          { name: "Worker" },
          { name: "Database" },
        ],
        links: [
          { source: "Web", target: "API" },
          { source: "API", target: "Auth" },
          { source: "API", target: "Database" },
          { source: "API", target: "Queue" },
          { source: "Queue", target: "Worker" },
          { source: "Worker", target: "Database" },
        ],
      },
    ],
  },
  mindmap: {
    series: [
      {
        type: "tree",
        layout: "radial",
        symbolSize: 10,
        initialTreeDepth: 2,
        label: { position: "top", fontSize: 12 },
        data: [
          {
            name: "Launch",
            children: [
              { name: "Product", children: [{ name: "Beta" }, { name: "Pricing" }] },
              { name: "Marketing", children: [{ name: "Site" }, { name: "Newsletter" }] },
              { name: "Support", children: [{ name: "Docs" }, { name: "Chat" }] },
            ],
          },
        ],
      },
    ],
  },
  treeview: {
    series: [
      {
        type: "tree",
        orient: "LR",
        symbolSize: 8,
        initialTreeDepth: 3,
        label: { position: "left", verticalAlign: "middle", align: "right" },
        leaves: { label: { position: "right", align: "left" } },
        data: [
          {
            name: "src",
            children: [
              { name: "components", children: [{ name: "Chart.tsx" }, { name: "List.tsx" }] },
              { name: "lib", children: [{ name: "catalog.ts" }] },
              { name: "index.tsx" },
            ],
          },
        ],
      },
    ],
  },
  treemap: {
    series: [
      {
        type: "treemap",
        roam: false,
        breadcrumb: { show: false },
        label: { show: true, fontSize: 14 },
        upperLabel: { show: true, height: 22, color: "#888" },
        itemStyle: { borderColor: "transparent", borderWidth: 0, gapWidth: 3 },
        data: [
          {
            name: "Product",
            children: [
              { name: "Web", value: 6 },
              { name: "Mobile", value: 4 },
            ],
          },
          {
            name: "Platform",
            children: [
              { name: "API", value: 5 },
              { name: "Data", value: 3 },
            ],
          },
          { name: "Support", value: 3 },
        ],
      },
    ],
  },
  sunburst: {
    series: [
      {
        type: "sunburst",
        radius: [0, "90%"],
        data: [
          {
            name: "Product",
            children: [
              {
                name: "Web",
                children: [
                  { name: "App", value: 3 },
                  { name: "Site", value: 3 },
                ],
              },
              { name: "Mobile", value: 4 },
            ],
          },
          {
            name: "Platform",
            children: [
              { name: "API", value: 5 },
              { name: "Data", value: 3 },
            ],
          },
        ],
      },
    ],
  },
  pie: {
    series: [
      {
        type: "pie",
        radius: ["35%", "60%"],
        label: { formatter: "{b} {d}%" },
        data: [
          { name: "Chrome", value: 65 },
          { name: "Safari", value: 20 },
          { name: "Firefox", value: 9 },
          { name: "Other", value: 6 },
        ],
      },
    ],
  },
  bar: {
    xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: [186, 305, 237, 73, 209, 214] }],
  },
  line: {
    xAxis: { type: "category", data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
    yAxis: { type: "value" },
    series: [
      { type: "line", name: "Desktop", data: [186, 305, 237, 73, 209, 214] },
      { type: "line", name: "Mobile", data: [80, 200, 120, 190, 130, 140] },
    ],
  },
  area: {
    xAxis: { type: "category", boundaryGap: false, data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] },
    yAxis: { type: "value" },
    series: [
      { type: "line", name: "Desktop", smooth: true, areaStyle: {}, data: [120, 180, 240, 310, 390, 460] },
      { type: "line", name: "Mobile", smooth: true, areaStyle: {}, data: [80, 120, 150, 200, 230, 260] },
    ],
  },
  radar: {
    radar: {
      indicator: [
        { name: "Speed", max: 100 },
        { name: "Cost", max: 100 },
        { name: "Reach", max: 100 },
        { name: "Quality", max: 100 },
        { name: "Support", max: 100 },
      ],
    },
    series: [
      {
        type: "radar",
        areaStyle: { opacity: 0.3 },
        data: [
          { name: "Us", value: [80, 60, 90, 70, 65] },
          { name: "Them", value: [60, 85, 55, 75, 80] },
        ],
      },
    ],
  },
  radial: {
    polar: { radius: ["30%", "85%"] },
    angleAxis: { max: 100, startAngle: 90, show: false },
    radiusAxis: { type: "category", data: ["Move", "Exercise", "Stand"], show: false },
    series: [
      {
        type: "bar",
        coordinateSystem: "polar",
        roundCap: true,
        barWidth: 18,
        colorBy: "data",
        showBackground: true,
        backgroundStyle: { opacity: 0.15 },
        data: [72, 55, 90],
      },
    ],
  },
  gauge: {
    series: [
      {
        type: "gauge",
        min: 0,
        max: 100,
        progress: { show: true, width: 18 },
        axisLine: { lineStyle: { width: 18 } },
        axisTick: { show: false },
        splitLine: { length: 12, lineStyle: { width: 2 } },
        pointer: { show: false },
        title: { offsetCenter: [0, "45%"] },
        detail: { fontSize: 32, offsetCenter: [0, "5%"], formatter: "{value}%" },
        data: [{ value: 68, name: "Done" }],
      },
    ],
  },
  scatter: {
    xAxis: { type: "value", name: "Price" },
    yAxis: { type: "value", name: "Rating" },
    series: [
      {
        type: "scatter",
        symbolSize: 14,
        data: [
          [10, 8],
          [15, 12],
          [22, 13],
          [28, 20],
          [35, 24],
          [41, 22],
          [50, 33],
          [58, 30],
          [63, 41],
          [70, 46],
          [78, 44],
          [85, 55],
        ],
      },
    ],
  },
  heatmap: {
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri"], splitArea: { show: true } },
    yAxis: { type: "category", data: ["Morning", "Midday", "Evening"], splitArea: { show: true } },
    visualMap: { show: false, min: 0, max: 10 },
    series: [
      {
        type: "heatmap",
        label: { show: true },
        data: [
          [0, 0, 5],
          [1, 0, 7],
          [2, 0, 3],
          [3, 0, 8],
          [4, 0, 2],
          [0, 1, 9],
          [1, 1, 6],
          [2, 1, 10],
          [3, 1, 4],
          [4, 1, 7],
          [0, 2, 2],
          [1, 2, 4],
          [2, 2, 6],
          [3, 2, 3],
          [4, 2, 9],
        ],
      },
    ],
  },
  calendar: {
    visualMap: { show: false, min: 0, max: 10 },
    calendar: {
      range: ["2026-01-05", "2026-03-01"],
      cellSize: ["auto", "auto"],
      left: 40,
      right: 20,
      top: 40,
      bottom: 20,
      yearLabel: { show: false },
      dayLabel: { firstDay: 1, nameMap: ["S", "M", "T", "W", "T", "F", "S"] },
      itemStyle: { color: "transparent" },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: [
          ["2026-01-05", 6],
          ["2026-01-06", 9],
          ["2026-01-07", 4],
          ["2026-01-09", 7],
          ["2026-01-12", 3],
          ["2026-01-13", 8],
          ["2026-01-15", 5],
          ["2026-01-16", 9],
          ["2026-01-20", 8],
          ["2026-01-21", 2],
          ["2026-01-23", 6],
          ["2026-01-27", 7],
          ["2026-01-28", 5],
          ["2026-01-30", 10],
          ["2026-02-02", 4],
          ["2026-02-03", 7],
          ["2026-02-05", 9],
          ["2026-02-09", 3],
          ["2026-02-10", 10],
          ["2026-02-11", 4],
          ["2026-02-13", 6],
          ["2026-02-17", 8],
          ["2026-02-18", 5],
          ["2026-02-20", 7],
          ["2026-02-24", 6],
          ["2026-02-25", 9],
          ["2026-02-27", 2],
        ],
      },
    ],
  },
  funnel: {
    series: [
      {
        type: "funnel",
        sort: "descending",
        gap: 4,
        label: { position: "inside" },
        data: [
          { value: 100, name: "Visited" },
          { value: 60, name: "Signed up" },
          { value: 35, name: "Trialed" },
          { value: 18, name: "Paid" },
        ],
      },
    ],
  },
  boxplot: {
    xAxis: { type: "category", data: ["A", "B", "C", "D"] },
    yAxis: { type: "value" },
    series: [
      {
        type: "boxplot",
        data: [
          [12, 20, 26, 33, 42],
          [18, 24, 30, 36, 48],
          [8, 14, 19, 25, 31],
          [22, 29, 35, 41, 55],
        ],
      },
    ],
  },
  candlestick: {
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Mon", "Tue", "Wed"] },
    yAxis: { type: "value", scale: true },
    series: [
      {
        type: "candlestick",
        data: [
          [20, 34, 10, 38],
          [40, 35, 30, 50],
          [31, 38, 33, 44],
          [38, 15, 5, 42],
          [15, 25, 12, 28],
          [25, 42, 20, 45],
          [42, 36, 30, 46],
          [36, 48, 34, 52],
        ],
      },
    ],
  },
  pictorial: {
    xAxis: { type: "category", data: ["Bikes", "Cars", "Buses"] },
    yAxis: { type: "value" },
    series: [
      {
        type: "pictorialBar",
        symbol: "roundRect",
        symbolRepeat: true,
        symbolSize: [24, 8],
        symbolMargin: 3,
        data: [42, 28, 15],
      },
    ],
  },
  parallel: {
    parallelAxis: [
      { dim: 0, name: "Price" },
      { dim: 1, name: "Weight" },
      { dim: 2, name: "Battery" },
      { dim: 3, name: "Screen" },
      { dim: 4, name: "Rating", type: "category", data: ["Poor", "Fair", "Good", "Great"] },
    ],
    series: [
      {
        type: "parallel",
        lineStyle: { width: 2 },
        data: [
          [1200, 1.3, 12, 14, "Great"],
          [900, 1.6, 9, 15, "Good"],
          [650, 1.9, 7, 14, "Fair"],
          [1500, 1.2, 15, 13, "Great"],
          [700, 2.1, 6, 16, "Poor"],
        ],
      },
    ],
  },
  stream: {
    singleAxis: {
      type: "time",
      boundaryGap: false,
      top: 20,
      bottom: 40,
      minInterval: 2592000000,
      axisLabel: { formatter: "{MMM}" },
    },
    series: [
      {
        type: "themeRiver",
        label: { show: false },
        data: [
          ["2026-01-01", 10, "Web"],
          ["2026-02-01", 18, "Web"],
          ["2026-03-01", 24, "Web"],
          ["2026-04-01", 20, "Web"],
          ["2026-01-01", 6, "Mobile"],
          ["2026-02-01", 12, "Mobile"],
          ["2026-03-01", 16, "Mobile"],
          ["2026-04-01", 22, "Mobile"],
          ["2026-01-01", 4, "API"],
          ["2026-02-01", 5, "API"],
          ["2026-03-01", 9, "API"],
          ["2026-04-01", 8, "API"],
        ],
      },
    ],
  },
  choropleth: {
    visualMap: { min: 0, max: 100, left: "left", bottom: "bottom", text: ["High", "Low"], calculable: false },
    series: [
      {
        type: "map",
        map: "world",
        roam: false,
        emphasis: { label: { show: false } },
        data: [
          { name: "United Kingdom", value: 90 },
          { name: "United States of America", value: 75 },
          { name: "Germany", value: 60 },
          { name: "Brazil", value: 45 },
          { name: "India", value: 55 },
          { name: "Australia", value: 35 },
          { name: "Japan", value: 65 },
        ],
      },
    ],
  },
  flowmap: {
    geo: {
      map: "world",
      roam: false,
      itemStyle: { areaColor: "#d9d9d9", borderColor: "#ffffff" },
      emphasis: { disabled: true },
    },
    series: [
      {
        type: "lines",
        coordinateSystem: "geo",
        lineStyle: { width: 2, curveness: 0.3 },
        data: [
          {
            coords: [
              [-0.13, 51.5],
              [-74.0, 40.7],
            ],
          },
          {
            coords: [
              [-0.13, 51.5],
              [139.7, 35.7],
            ],
          },
          {
            coords: [
              [-0.13, 51.5],
              [151.2, -33.9],
            ],
          },
          {
            coords: [
              [-0.13, 51.5],
              [77.2, 28.6],
            ],
          },
        ],
      },
      {
        type: "scatter",
        coordinateSystem: "geo",
        symbolSize: 8,
        data: [
          { name: "London", value: [-0.13, 51.5] },
          { name: "New York", value: [-74.0, 40.7] },
          { name: "Tokyo", value: [139.7, 35.7] },
          { name: "Sydney", value: [151.2, -33.9] },
          { name: "Delhi", value: [77.2, 28.6] },
        ],
      },
    ],
  },
  quadrant: {
    xAxis: { type: "value", min: 0, max: 100, name: "Reach", splitLine: { show: false } },
    yAxis: { type: "value", min: 0, max: 100, name: "Engagement", splitLine: { show: false } },
    series: [
      {
        type: "scatter",
        symbolSize: 16,
        label: { show: true, position: "right", formatter: "{b}" },
        markLine: { silent: true, symbol: "none", label: { show: false }, data: [{ xAxis: 50 }, { yAxis: 50 }] },
        data: [
          { name: "Campaign A", value: [30, 60] },
          { name: "Campaign B", value: [80, 40] },
          { name: "Campaign C", value: [70, 75] },
        ],
      },
    ],
  },
} satisfies Record<string, EchartsOption>;
