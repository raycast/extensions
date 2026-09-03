export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartSeries {
  color: string;
  label: string;
  points: ChartPoint[];
}

export interface BarChartItem {
  color: string;
  label: string;
  value: number;
}
