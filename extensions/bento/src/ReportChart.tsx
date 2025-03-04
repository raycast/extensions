import React, { useMemo } from "react";
import { Detail } from "@raycast/api";
import { ReportData } from "./api-client";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AreaClosed } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { Text } from "@visx/text";
import { LinearGradient } from "@visx/gradient";
import { GridRows, GridColumns } from "@visx/grid";
import { renderToStaticMarkup } from "react-dom/server";
import { timeFormat } from "d3-time-format";

interface ReportChartProps {
  report: ReportData;
}

const width = 800;
const height = 400;
const margin = { top: 20, right: 20, bottom: 60, left: 60 };
const numTicks = 5;
const formatDate = timeFormat("%b %d");

const Chart = ({ report }: ReportChartProps) => {
  const data = report.data;

  // Scales
  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [new Date(data[0].x), new Date(data[data.length - 1].x)],
        range: [margin.left, width - margin.right],
      }),
    [data]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, Math.max(...data.map((d) => d.y))],
        range: [height - margin.bottom, margin.top],
      }),
    [data]
  );

  return (
    <svg width={width} height={height}>
      <LinearGradient id="area-gradient" from="#7c3aed" to="#ec4899" fromOpacity={0.6} toOpacity={0.1} />
      <Group>
        <GridRows
          scale={yScale}
          width={width - margin.left - margin.right}
          left={margin.left}
          strokeDasharray="2,2"
          stroke="#3f3f46"
          numTicks={numTicks}
        />
        <GridColumns
          scale={xScale}
          height={height - margin.top - margin.bottom}
          top={margin.top}
          strokeDasharray="2,2"
          stroke="#3f3f46"
          numTicks={numTicks}
        />
        <AreaClosed
          data={data}
          x={(d) => xScale(new Date(d.x))}
          y={(d) => yScale(d.y)}
          yScale={yScale}
          strokeWidth={2}
          stroke="url(#area-gradient)"
          fill="url(#area-gradient)"
          curve={curveMonotoneX}
        />
        <AxisLeft
          scale={yScale}
          left={margin.left}
          label="Count"
          stroke="#a1a1aa"
          tickStroke="#a1a1aa"
          numTicks={numTicks}
          hideZero
          tickComponent={() => null}
          labelProps={{
            fill: "#a1a1aa",
            fontSize: 12,
            textAnchor: "middle",
          }}
        />
        <AxisBottom
          scale={xScale}
          top={height - margin.bottom}
          label="Date"
          stroke="#a1a1aa"
          tickStroke="#a1a1aa"
          numTicks={numTicks}
          hideZero
          tickComponent={() => null}
        />
        {data.map((d, i) => (
          <Text
            key={i}
            x={xScale(new Date(d.x))}
            y={height - margin.bottom + 30}
            fontSize={12}
            textAnchor="middle"
            angle={45}
            fill="#a1a1aa"
          >
            {formatDate(new Date(d.x))}
          </Text>
        ))}
      </Group>
    </svg>
  );
};

export default function ReportChart({ report }: ReportChartProps) {
  const chartSvg = renderToStaticMarkup(<Chart report={report} />);
  const chartDataUrl = `data:image/svg+xml;base64,${Buffer.from(chartSvg).toString("base64")}`;

  const markdown = `
# ${report.report_name}

![Chart](${chartDataUrl})

## Report Details
- **Report Type**: ${report.report_type}
- **Chart Style**: Area Chart

## Data Points
${report.data.map((item) => `- ${formatDate(new Date(item.x))}: ${item.y} ${item.g}`).join("\n")}
  `;

  return <Detail markdown={markdown} />;
}
