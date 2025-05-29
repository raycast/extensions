import {
  CloudRunServiceResponse,
  CloudRunServiceItem,
  ProcessedErrorData,
  MonitoringResponse,
  LoggingResponse,
  LogEntry,
  MetricPoint,
} from "./cloud-run-types";
import { GCPCloudRunService } from "../types";

/**
 * Transforms Cloud Run API response into our internal service format
 */
export function transformCloudRunResponse(data: CloudRunServiceResponse, region: string): GCPCloudRunService[] {
  const cloudRunServices = data.items || [];

  return cloudRunServices.map((service) => transformCloudRunService(service, region));
}

/**
 * Transforms a single Cloud Run service item
 */
export function transformCloudRunService(service: CloudRunServiceItem, region: string): GCPCloudRunService {
  const spec = service.spec || {};
  const status = service.status || {};
  const metadata = service.metadata || {};

  // Handle traffic allocation
  const trafficData = spec.traffic || [];

  // If no traffic specification, assume 100% to latest
  const processedTraffic =
    trafficData.length === 0
      ? [{ revisionName: "LATEST", percent: 100 }]
      : trafficData.map((t) => ({
          revisionName: t.revisionName || "LATEST",
          percent: t.percent || 0,
        }));

  return {
    name: metadata.name || "",
    region,
    url: status.url || "",
    status: status.conditions?.[0]?.status === "True" ? "READY" : "NOT_READY",
    lastModified: metadata.annotations?.["run.googleapis.com/lastModifier"] || "",
    image: spec.template?.spec?.containers?.[0]?.image || "Unknown",
    traffic: processedTraffic,
  };
}

/**
 * Processes Cloud Monitoring API response into metrics data
 */
export function processMetricsResponse(
  response: MonitoringResponse,
  metricName: string,
  intervalSeconds: number = 300,
): Array<{ timestamp: string; value: number }> {
  const timeSeries = response.timeSeries || [];
  const allPoints: Array<{ timestamp: string; value: number }> = [];

  for (const ts of timeSeries) {
    if (ts.points) {
      const points = ts.points.map((point: MetricPoint) => {
        let value = 0;

        // Handle different value types
        if (point.value.doubleValue !== undefined) {
          value = parseFloat(point.value.doubleValue);
        } else if (point.value.int64Value !== undefined) {
          value = parseFloat(point.value.int64Value);
        } else if (point.value.distributionValue) {
          // For latency metrics, use the mean value from distribution
          value = parseFloat(point.value.distributionValue.mean || "0");
        }

        // Convert latency from seconds to milliseconds if needed
        if (metricName === "latency" && value < 10) {
          value = value * 1000; // Convert to milliseconds
        }

        // Convert rate metrics to actual counts
        if (metricName === "requestCount") {
          value = value * intervalSeconds;
        }

        return {
          timestamp: point.interval.endTime,
          value: value,
        };
      });
      allPoints.push(...points);
    }
  }

  // Sort by timestamp and remove duplicates
  return allPoints
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .filter((point, index, self) => index === self.findIndex((p) => p.timestamp === point.timestamp));
}

/**
 * Processes Cloud Logging API response into error data
 */
export function processLoggingResponse(response: LoggingResponse): ProcessedErrorData[] {
  const entries = response.entries || [];

  // Group errors by message pattern
  const errorGroups = new Map<string, { count: number; lastSeen: string; fullMessage: string }>();

  entries.forEach((entry: LogEntry) => {
    const message = extractErrorMessage(entry);
    const errorKey = categorizeError(message);

    const existing = errorGroups.get(errorKey);
    if (existing) {
      existing.count++;
      if (entry.timestamp && new Date(entry.timestamp) > new Date(existing.lastSeen)) {
        existing.lastSeen = entry.timestamp;
      }
    } else {
      errorGroups.set(errorKey, {
        count: 1,
        lastSeen: entry.timestamp || new Date().toISOString(),
        fullMessage: message,
      });
    }
  });

  // Convert to array and sort by count
  return Array.from(errorGroups.entries())
    .map(([message, data]) => ({
      message,
      count: data.count,
      timestamp: data.lastSeen,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 errors
}

/**
 * Extracts error message from log entry
 */
function extractErrorMessage(entry: LogEntry): string {
  if (entry.textPayload) {
    return entry.textPayload;
  }

  if (entry.jsonPayload?.message && typeof entry.jsonPayload.message === "string") {
    return entry.jsonPayload.message;
  }

  if (entry.protoPayload?.status?.message) {
    return entry.protoPayload.status.message;
  }

  // Try to extract from jsonPayload if it's an object
  if (entry.jsonPayload && typeof entry.jsonPayload === "object") {
    const payload = entry.jsonPayload;

    // Look for common error fields
    const errorFields = ["error", "message", "msg", "description"];
    for (const field of errorFields) {
      if (payload[field] && typeof payload[field] === "string") {
        return payload[field];
      }
    }

    // Fallback to JSON string
    try {
      return JSON.stringify(payload);
    } catch {
      return "Unknown error format";
    }
  }

  return "Unknown error";
}

/**
 * Categorizes error messages for grouping
 */
function categorizeError(message: string): string {
  if (!message || typeof message !== "string") {
    return "Unknown error";
  }

  // Specific patterns for common errors
  if (message.includes("BadRequestError: Error code: 400")) {
    // Extract just the error type
    const match = message.match(/BadRequestError: Error code: \d+ - \{error'?: \{.*?'type': '([^']+)'/)?.[1];
    return match ? `BadRequestError: ${match}` : "BadRequestError: Error code: 400";
  }

  if (message.includes("TypeError: string indices must be integers")) {
    return "TypeError: string indices must be integers";
  }

  if (message.includes("HTTPError: 400 Client Error")) {
    return "HTTPError: 400 Client Error: Bad Request";
  }

  if (message.includes("KeyError:")) {
    const match = message.match(/KeyError: '([^']+)'/)?.[1];
    return match ? `KeyError: '${match}'` : "KeyError";
  }

  if (message.includes("panic: runtime error: index out of range")) {
    return "panic: runtime error: index out of range [0] with length 0";
  }

  if (message.includes("memory limit exceeded")) {
    return "Memory limit exceeded";
  }

  if (message.includes("timeout")) {
    return "Request timeout";
  }

  if (message.includes("Traceback (most recent call last):")) {
    // For Python tracebacks, extract the actual error from the last line
    const lines = message.split("\n");
    const errorLine = lines[lines.length - 1] || lines[0];
    return errorLine.substring(0, 100);
  }

  // For other long messages, take first 100 chars
  if (message.length > 100) {
    return message.substring(0, 100) + "...";
  }

  return message;
}

/**
 * Validates that a response has the expected Cloud Run API structure
 */
export function isValidCloudRunResponse(data: unknown): data is CloudRunServiceResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const response = data as Record<string, unknown>;

  // Check if it has the expected structure
  if ("items" in response) {
    const items = response.items;
    if (Array.isArray(items)) {
      // Validate at least one item has the expected structure
      return (
        items.length === 0 ||
        items.every(
          (item) => item && typeof item === "object" && ("metadata" in item || "spec" in item || "status" in item),
        )
      );
    }
  }

  // Empty response is also valid
  return true;
}

/**
 * Validates monitoring API response
 */
export function isValidMonitoringResponse(data: unknown): data is MonitoringResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const response = data as Record<string, unknown>;

  // Check for timeSeries array or empty response
  return !("timeSeries" in response) || Array.isArray(response.timeSeries);
}

/**
 * Validates logging API response
 */
export function isValidLoggingResponse(data: unknown): data is LoggingResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const response = data as Record<string, unknown>;

  // Check for entries array or empty response
  return !("entries" in response) || Array.isArray(response.entries);
}

/**
 * Safely parses JSON response with type validation
 */
export async function parseJsonResponse<T>(response: Response, validator: (data: unknown) => data is T): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!validator(data)) {
    throw new Error("Invalid response format from API");
  }

  return data;
}
