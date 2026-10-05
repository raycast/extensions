/**
 * HTTP Performance Analyzer - Type Definitions
 */

/**
 * Complete HTTP performance metrics from analysis
 */
export interface HTTPPerformanceMetrics {
  // Request Information
  url: string;
  method: string;
  statusCode: number;
  remoteIp: string;
  localIp: string;
  httpVersion: string;

  // Raw curl timing data (in seconds)
  totalTime: number;
  namelookupTime: number;
  connectTime: number;
  appConnectTime: number;
  preTransferTime: number;
  startTransferTime: number;
  redirectTime: number;

  // Transfer metrics
  sizeDownload: number;
  speedDownload: number;

  // Calculated/Derived metrics (in seconds)
  dnsTime: number;
  tcpTime: number;
  tlsTime: number;
  serverTime: number;
  transferTime: number;
}

/**
 * Options for HTTP performance analysis
 */
export interface HTTPPerformanceOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  maxRedirects?: number;
}

/**
 * Form input values from user
 */
export interface FormValues {
  url: string;
  method: string;
  headers: string;
  followRedirects: boolean;
}
