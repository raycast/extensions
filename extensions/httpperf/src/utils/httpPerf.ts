import { exec } from "child_process";
import { promisify } from "util";
import { HTTPPerformanceMetrics, HTTPPerformanceOptions } from "../types";

const execAsync = promisify(exec);

/**
 * Analyze HTTP performance using curl command with timing information
 */
export async function analyzeHTTPPerformance(options: HTTPPerformanceOptions): Promise<HTTPPerformanceMetrics> {
  const { url, method = "GET", headers = {}, followRedirects = true, maxRedirects = 5 } = options;

  // Validate URL format
  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(url)) {
    throw new Error("Invalid URL format");
  }

  // Build curl command with timing format
  const curlFormat = [
    "http_code=%{http_code}",
    "time_total=%{time_total}",
    "time_namelookup=%{time_namelookup}",
    "time_connect=%{time_connect}",
    "time_appconnect=%{time_appconnect}",
    "time_pretransfer=%{time_pretransfer}",
    "time_redirect=%{time_redirect}",
    "time_starttransfer=%{time_starttransfer}",
    "size_download=%{size_download}",
    "speed_download=%{speed_download}",
    "remote_ip=%{remote_ip}",
    "local_ip=%{local_ip}",
    "http_version=%{http_version}",
  ].join("\n");

  const curlArgs: string[] = ["-X", method, "-w", `"${curlFormat}"`, "-o", "/dev/null", "-s", "-S"];

  // Add follow redirects option
  if (followRedirects) {
    curlArgs.push("-L", "--max-redirs", String(maxRedirects));
  }

  // Add custom headers
  for (const [key, value] of Object.entries(headers)) {
    curlArgs.push("-H", `"${key}: ${value}"`);
  }

  curlArgs.push(`"${url}"`);

  const curlCommand = `curl ${curlArgs.join(" ")}`;

  try {
    const { stdout, stderr } = await execAsync(curlCommand, {
      timeout: 30000, // 30 seconds timeout
    });

    if (stderr && !stdout) {
      throw new Error(`curl error: ${stderr}`);
    }

    // Parse curl output
    const metrics = parseCurlOutput(stdout);

    // Calculate derived metrics
    const dnsTime = metrics.namelookupTime;
    const tcpTime = metrics.connectTime - metrics.namelookupTime;
    const tlsTime = metrics.appConnectTime > 0 ? metrics.appConnectTime - metrics.connectTime : 0;
    const serverTime = metrics.startTransferTime - (metrics.appConnectTime || metrics.connectTime);
    const transferTime = metrics.totalTime - metrics.startTransferTime;

    return {
      ...metrics,
      url,
      method,
      dnsTime,
      tcpTime,
      tlsTime,
      serverTime,
      transferTime,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze HTTP performance: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse curl output with timing information
 */
function parseCurlOutput(
  output: string,
): Omit<HTTPPerformanceMetrics, "url" | "method" | "dnsTime" | "tcpTime" | "tlsTime" | "serverTime" | "transferTime"> {
  const lines = output.trim().split("\n");
  const data: Record<string, string> = {};

  for (const line of lines) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=");
    if (key && value) {
      data[key.trim()] = value.trim();
    }
  }

  return {
    statusCode: parseInt(data.http_code || "0", 10),
    totalTime: parseFloat(data.time_total || "0"),
    namelookupTime: parseFloat(data.time_namelookup || "0"),
    connectTime: parseFloat(data.time_connect || "0"),
    appConnectTime: parseFloat(data.time_appconnect || "0"),
    preTransferTime: parseFloat(data.time_pretransfer || "0"),
    startTransferTime: parseFloat(data.time_starttransfer || "0"),
    redirectTime: parseFloat(data.time_redirect || "0"),
    sizeDownload: parseFloat(data.size_download || "0"),
    speedDownload: parseFloat(data.speed_download || "0"),
    remoteIp: data.remote_ip || "",
    localIp: data.local_ip || "",
    httpVersion: data.http_version || "",
  };
}

/**
 * Format time in milliseconds
 */
export function formatTime(seconds: number): string {
  const ms = seconds * 1000;
  if (ms < 1) {
    const microseconds = ms * 1000;
    return `${microseconds.toFixed(0)}μs`;
  }
  return `${ms.toFixed(2)}ms`;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format speed in bytes per second
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Generate ASCII timeline visualization
 */
export function generateTimeline(metrics: HTTPPerformanceMetrics): string {
  const { dnsTime, tcpTime, tlsTime, serverTime, transferTime, totalTime } = metrics;

  // Calculate percentages
  // Safeguard against division by zero
  const dnsPercent = totalTime > 0 ? (dnsTime / totalTime) * 100 : 0;
  const tcpPercent = totalTime > 0 ? (tcpTime / totalTime) * 100 : 0;
  const tlsPercent = totalTime > 0 ? (tlsTime / totalTime) * 100 : 0;
  const serverPercent = totalTime > 0 ? (serverTime / totalTime) * 100 : 0;
  const transferPercent = totalTime > 0 ? (transferTime / totalTime) * 100 : 0;

  // Create timeline bar (40 characters wide for better display)
  const barWidth = 40;
  const dnsBar = Math.round((dnsPercent / 100) * barWidth);
  const tcpBar = Math.round((tcpPercent / 100) * barWidth);
  const tlsBar = Math.round((tlsPercent / 100) * barWidth);
  const serverBar = Math.round((serverPercent / 100) * barWidth);
  const transferBar = Math.round((transferPercent / 100) * barWidth);

  let timeline = "```\n";
  timeline += "╭─────────────────────────────────────────────────────────────╮\n";
  timeline += "│                    Request Timeline                         │\n";
  timeline += "├─────────────────────────────────────────────────────────────┤\n";

  // DNS
  if (dnsBar > 0) {
    const bar = "▓".repeat(dnsBar) + "░".repeat(Math.max(0, barWidth - dnsBar));
    timeline += `│ 🔍 ${bar} ${formatTime(dnsTime).padEnd(10)} │ DNS\n`;
  }

  // TCP
  if (tcpBar > 0) {
    const bar = "▓".repeat(tcpBar) + "░".repeat(Math.max(0, barWidth - tcpBar));
    timeline += `│ 🔌 ${bar} ${formatTime(tcpTime).padEnd(10)} │ TCP\n`;
  }

  // TLS
  if (tlsBar > 0) {
    const bar = "▓".repeat(tlsBar) + "░".repeat(Math.max(0, barWidth - tlsBar));
    timeline += `│ 🔒 ${bar} ${formatTime(tlsTime).padEnd(10)} │ TLS\n`;
  }

  // Server
  if (serverBar > 0) {
    const bar = "▓".repeat(serverBar) + "░".repeat(Math.max(0, barWidth - serverBar));
    timeline += `│ ⚙️  ${bar} ${formatTime(serverTime).padEnd(10)} │ Server\n`;
  }

  // Transfer
  if (transferBar > 0) {
    const bar = "▓".repeat(transferBar) + "░".repeat(Math.max(0, barWidth - transferBar));
    timeline += `│ 📥 ${bar} ${formatTime(transferTime).padEnd(10)} │ Transfer\n`;
  }

  timeline += "├─────────────────────────────────────────────────────────────┤\n";
  const totalBar = "█".repeat(barWidth);
  timeline += `│ ⏱️  ${totalBar} ${formatTime(totalTime).padEnd(10)} │ TOTAL\n`;
  timeline += "╰─────────────────────────────────────────────────────────────╯\n";
  timeline += "```";

  return timeline;
}
