export type MemoryGeneration = "DDR4" | "DDR5";

export interface RamRadarPoint {
  date: string;
  avgPricePerGb: number;
  productCount: number;
}

export interface RamRadarResponse {
  ddr4: RamRadarPoint[];
  ddr5: RamRadarPoint[];
}

export interface MarketTrendPoint {
  date: string;
  avgPricePerGb: number;
  productCount: number;
}

export interface MarketTrendSeries {
  generation: MemoryGeneration;
  latest: MarketTrendPoint;
  previous?: MarketTrendPoint;
  changePercent?: number;
  history: MarketTrendPoint[];
}

export interface MarketTrendsData {
  series: MarketTrendSeries[];
  lastUpdated: string;
}
