import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

import { GREEN, MUTE } from './brand';
import type { PricePoint } from './types';

echarts.use([LineChart, GridComponent, SVGRenderer]);

const rendered = new Map<string, string>();
const CHART_CAP = 12;

export type ChartKind = 'percent' | 'level';

function fmtTick(n: number, kind: ChartKind): string {
  if (kind === 'percent') {
    return Math.abs(n) >= 10 ? `${n.toFixed(1)}%` : `${n.toFixed(2)}%`;
  }
  return n.toFixed(2);
}

/** Dark line chart as an SVG data URI for Raycast Detail markdown. Same path Polymarket uses. */
export function renderSeriesChart(opts: {
  id: string;
  deck: string;
  points: PricePoint[];
  kind: ChartKind;
}): string | null {
  const pts = [...opts.points].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (pts.length < 2) return null;

  const values = pts.map((p) => p.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const memoKey = `${opts.id}:${opts.kind}:${pts[0].timestamp}:${pts[pts.length - 1].timestamp}:${min}:${max}:${pts.length}`;
  const hit = rendered.get(memoKey);
  if (hit) return hit;

  const span = max - min;
  const pad = span === 0 ? Math.max(Math.abs(min) * 0.08, 0.5) : span * 0.18;

  const chart = echarts.init(null, null, {
    renderer: 'svg',
    ssr: true,
    width: 880,
    height: 360,
  });

  chart.setOption({
    backgroundColor: 'transparent',
    animation: false,
    grid: { left: 52, right: 16, top: 20, bottom: 28 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#3a3a3c' } },
      axisTick: { show: false },
      axisLabel: {
        color: MUTE,
        fontSize: 11,
        hideOverlap: true,
        formatter: (value: number) =>
          new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: min - pad,
      max: max + pad,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: MUTE,
        fontSize: 11,
        formatter: (value: number) => fmtTick(value, opts.kind),
      },
      splitLine: { lineStyle: { color: '#2c2c2e', type: 'solid' } },
    },
    series: [
      {
        type: 'line',
        smooth: 0.15,
        symbol: 'none',
        data: pts.map((p) => [new Date(p.timestamp).getTime(), p.price]),
        lineStyle: { width: 2, color: GREEN },
        areaStyle: { color: GREEN, opacity: 0.12 },
        markPoint: {
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: { color: GREEN },
          label: {
            show: true,
            formatter: fmtTick(values[values.length - 1], opts.kind),
            color: '#f2f2f7',
            backgroundColor: '#2c2c2e',
            padding: [3, 6],
            borderRadius: 3,
            fontSize: 11,
          },
          data: [
            {
              coord: [new Date(pts[pts.length - 1].timestamp).getTime(), values[values.length - 1]],
            },
          ],
        },
      },
    ],
  });

  const svg = chart.renderToSVGString();
  chart.dispose();
  const href = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  rendered.set(memoKey, href);
  while (rendered.size > CHART_CAP) {
    const oldest = rendered.keys().next().value;
    if (oldest == null) break;
    rendered.delete(oldest);
  }
  return href;
}
