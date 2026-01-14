import * as echarts from "echarts";
import { State } from "@lib/haapi";
import { Connection, getCollection } from "home-assistant-js-websocket";
import { getHAWSConnection } from "@lib/common";
import { EChartsOption } from "echarts";

interface Statistic {
  start: number;
  end: number;
  mean?: number;
  state?: number;
}

interface Statistics {
  [k: string]: Statistic[];
}

export async function getChartMarkdownAsync(state: State): Promise<string> {
  const conn = await getHAWSConnection();
  const key = "history_" + state.entity_id;
  const date = new Date();

  date.setDate(date.getDate() - 1);

  const fetchHistory = (conn: Connection) =>
    conn.sendMessagePromise<Statistics>({
      type: "recorder/statistics_during_period",
      period: "5minute",
      start_time: date.toISOString(),
      statistic_ids: [state.entity_id],
      types: ["mean", "state"],
    });

  const collection = getCollection(conn, key, fetchHistory);

  if (!collection.state) {
    await collection.refresh();
  }

  const statistics = collection.state[state.entity_id] ?? [];

  if (statistics.length === 0) {
    throw new Error("no statistics found");
  }

  const data = statistics.map((d) => [
    new Date(d.start).toISOString(),
    d.mean ? d.mean.toFixed(2) : d.state?.toFixed(2),
  ]);

  const min = statistics
    .map((d) => (d.mean ? Math.floor(d.mean) : d.state ? Math.floor(d.state) : 0))
    .sort((a, b) => a - b);

  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: "600",
    height: "500",
  });

  const options: EChartsOption = {
    dataset: {
      source: data,
      dimensions: ["timestamp", "value"],
    },
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: 16,
      },
      minInterval: 100,
    },
    yAxis: {
      axisLabel: {
        formatter: `{value} ${state.attributes["unit_of_measurement"]}`,
        fontSize: 16,
      },
      min: min[0],
    },
    series: [
      {
        name: "value",
        type: "line",
        encode: {
          x: "timestamp",
          y: "value",
        },
        showSymbol: false,
        smooth: true,
        lineStyle: {
          color: "#5b8ff9",
          width: 2,
        },
      },
    ],
  };

  chart.setOption(options);

  const svgMarkup = chart.renderToSVGString();
  chart.dispose();

  const svgBase64 = Buffer.from(svgMarkup).toString("base64");
  return `![Illustration](data:image/svg+xml;base64,${svgBase64})`;
}
