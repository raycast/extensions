import React, { useMemo } from "react";
import { ReportData } from "./api-client";
import { scaleTime, scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { Group } from "@visx/group";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { Text } from "@visx/text";
import { LinearGradient } from "@visx/gradient";
import { GridRows, GridColumns } from "@visx/grid";
import { timeFormat } from "d3-time-format";

interface ChartProps {
  report: ReportData;
  width: number;
  height: number;
  gradientId: string;
}

const margin = { top: 20, right: 20, bottom: 60, left: 60 };

const formatDate = timeFormat("%b %d");

export const Chart: React.FC<ChartProps> = ({ report, width, height, gradientId }) => {
  const data = report.data;

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [new Date(data[0].x), new Date(data[data.length - 1].x)],
        range: [margin.left, width - margin.right],
      }),
    [data, width]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, Math.max(...data.map((d) => d.y))],
        range: [height - margin.bottom, margin.top],
      }),
    [data, height]
  );

  return (
    <svg width={width} height={height}>
      <LinearGradient id={gradientId} from="#7c3aed" to="#ec4899" fromOpacity={1} toOpacity={1} vertical={true} />
      <Group>
        <GridRows
          scale={yScale}
          width={width - margin.left - margin.right}
          left={margin.left}
          strokeDasharray="2,2"
          stroke="#3f3f46"
        />
        <GridColumns
          scale={xScale}
          height={height - margin.top - margin.bottom}
          top={margin.top}
          strokeDasharray="2,2"
          stroke="#3f3f46"
        />
        <LinePath
          data={data}
          x={(d) => xScale(new Date(d.x))}
          y={(d) => yScale(d.y)}
          stroke={`url(#${gradientId})`}
          strokeWidth={3}
          curve={curveMonotoneX}
        />
        <AxisLeft
          scale={yScale}
          left={margin.left}
          label="Count"
          stroke="#a1a1aa"
          tickStroke="#a1a1aa"
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
          hideZero
          tickComponent={() => null}
          labelProps={{
            fill: "#a1a1aa",
            fontSize: 12,
            textAnchor: "middle",
          }}
        />
        {data.map((d, i) => (
          <Text
            key={i}
            x={xScale(new Date(d.x))}
            y={height - margin.bottom + 20}
            fontSize={10}
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
