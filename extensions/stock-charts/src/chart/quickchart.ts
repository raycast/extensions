import { INTERVAL_CONFIG, type Interval } from "./intervals";

const QUICKCHART_BASE = "https://quickchart.io";
const TARGET_POINTS = 60;
const DOWNSAMPLE_THRESHOLD = 80;
const MAX_GET_LENGTH = 1800;

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const result: T[] = [arr[0]];
  const step = (arr.length - 1) / (target - 1);
  for (let i = 1; i < target - 1; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

function serializeConfig(config: ReturnType<typeof buildChartConfig>): string {
  return JSON.stringify(config).replace(
    /"(getGradientFillHelper\([^"]*\))"/g,
    "$1",
  );
}

export function buildChartConfig(
  labels: string[],
  prices: number[],
  isUp: boolean,
  volumes?: number[],
) {
  const lineColor = isUp ? "#34C759" : "#FF3B30";
  const gradientTop = isUp ? "rgba(52,199,89,0.28)" : "rgba(255,59,48,0.28)";
  const volColor = "rgba(255,255,255,0.12)";

  const datasets: Record<string, unknown>[] = [
    {
      data: prices,
      borderColor: lineColor,
      backgroundColor: `getGradientFillHelper('vertical', ['${gradientTop}', 'rgba(0,0,0,0)'])`,
      fill: true,
      pointRadius: 0,
      borderWidth: 2.5,
      lineTension: 0.3,
      yAxisID: "price",
    },
  ];

  if (volumes && volumes.length === prices.length) {
    datasets.push({
      type: "bar" as const,
      data: volumes,
      backgroundColor: volColor,
      borderWidth: 0,
      yAxisID: "volume",
      barPercentage: 0.8,
      categoryPercentage: 1.0,
    });
  }

  return {
    type: "line" as const,
    data: { labels, datasets },
    options: {
      legend: { display: false },
      layout: { padding: { left: 4, right: 12, top: 8, bottom: 4 } },
      scales: {
        xAxes: [
          {
            ticks: {
              maxTicksLimit: 6,
              fontColor: "#666",
              fontSize: 10,
              padding: 6,
            },
            gridLines: { display: false },
          },
        ],
        yAxes: [
          {
            id: "price",
            position: "right" as const,
            ticks: {
              fontColor: "#666",
              fontSize: 10,
              padding: 8,
              maxTicksLimit: 5,
            },
            gridLines: {
              color: "rgba(255,255,255,0.06)",
              drawBorder: false,
            },
          },
          ...(volumes && volumes.length > 0
            ? [
                {
                  id: "volume",
                  position: "right" as const,
                  display: false,
                  ticks: {
                    min: 0,
                    max: Math.max(...volumes) * 5,
                  },
                  gridLines: { display: false },
                },
              ]
            : []),
        ],
      },
    },
  };
}

export async function buildChartUrl(
  timestamps: number[],
  prices: number[],
  interval: Interval,
  volumes?: number[],
  signal?: AbortSignal,
): Promise<string> {
  const { formatLabel } = INTERVAL_CONFIG[interval];

  let ts = timestamps;
  let pr = prices;
  let vol = volumes;
  if (ts.length > DOWNSAMPLE_THRESHOLD) {
    const indices = downsample(
      Array.from({ length: ts.length }, (_, i) => i),
      TARGET_POINTS,
    );
    ts = indices.map((i) => timestamps[i]);
    pr = indices.map((i) => prices[i]);
    if (vol) vol = indices.map((i) => volumes![i]);
  }

  const labels = ts.map(formatLabel);
  const isUp = pr[pr.length - 1] >= pr[0];
  const config = buildChartConfig(labels, pr, isUp, vol);
  const json = serializeConfig(config);

  if (json.length < MAX_GET_LENGTH) {
    return `${QUICKCHART_BASE}/chart?c=${encodeURIComponent(json)}&w=600&h=300&bkg=%23000000&devicePixelRatio=2`;
  }

  const res = await fetch(`${QUICKCHART_BASE}/chart/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chart: json,
      width: 600,
      height: 300,
      backgroundColor: "#000000",
      devicePixelRatio: 2,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`QuickChart POST failed: ${res.status}`);
  }

  const body = (await res.json()) as { url: string };
  return body.url;
}

export async function buildChartMarkdown(
  timestamps: number[],
  prices: number[],
  interval: Interval,
  volumes?: number[],
  signal?: AbortSignal,
): Promise<string> {
  const url = await buildChartUrl(timestamps, prices, interval, volumes, signal);
  return `![Stock Chart](${url}?raycast-width=600&raycast-height=300)`;
}
