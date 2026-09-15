export const HELPER_PROTOCOL_VERSION = 1 as const;

export type BenchmarkPhase = "preparing" | "warmup" | "write" | "read" | "cleanup";
export type BenchmarkConfidence = "high" | "medium" | "low";

export interface BenchmarkMeasurement {
  durationSeconds: number;
  megabytesPerSecond: number;
  variation: number;
}

export interface BenchmarkVolume {
  id: string;
  name: string;
}

export interface BenchmarkResult {
  methodologyVersion: string;
  maxBytes: number;
  measuredBytes: number;
  write: BenchmarkMeasurement;
  read: BenchmarkMeasurement;
  confidence: BenchmarkConfidence;
  volume?: BenchmarkVolume;
}

export type BenchmarkEvent =
  | {
      protocolVersion: 1;
      type: "started";
      methodologyVersion: string;
      maxBytes: number;
    }
  | {
      protocolVersion: 1;
      type: "progress";
      phase: BenchmarkPhase;
      bytesProcessed: number;
      totalBytes: number;
      progress: number;
      throughputMBps: number;
    }
  | {
      protocolVersion: 1;
      type: "completed";
      result: BenchmarkResult;
    }
  | {
      protocolVersion: 1;
      type: "cancelled";
      code: "cancelled";
      message: string;
    }
  | {
      protocolVersion: 1;
      type: "error";
      code: string;
      message: string;
    }
  | {
      protocolVersion: 1;
      type: "description";
      description: {
        protocolVersion: 1;
        methodologyVersion: string;
        supportedTests: string[];
      };
    };

export function parseBenchmarkEvent(line: string): BenchmarkEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("Helper emitted invalid JSON");
  }

  const event = record(value, "event");
  const protocolVersion = number(event.protocolVersion, "protocolVersion");
  if (protocolVersion !== HELPER_PROTOCOL_VERSION) {
    throw new Error(`Unsupported helper protocol version: ${protocolVersion}`);
  }

  const type = string(event.type, "type");
  switch (type) {
    case "started":
      return {
        protocolVersion,
        type,
        methodologyVersion: string(event.methodologyVersion, "methodologyVersion"),
        maxBytes: number(event.maxBytes, "maxBytes"),
      };
    case "progress":
      return {
        protocolVersion,
        type,
        phase: benchmarkPhase(event.phase),
        bytesProcessed: number(event.bytesProcessed, "bytesProcessed"),
        totalBytes: number(event.totalBytes, "totalBytes"),
        progress: number(event.progress, "progress"),
        throughputMBps: number(event.throughputMBps, "throughputMBps"),
      };
    case "completed":
      return { protocolVersion, type, result: parseBenchmarkResult(event.result) };
    case "cancelled":
      return {
        protocolVersion,
        type,
        code: "cancelled",
        message: string(event.message, "message"),
      };
    case "error":
      return {
        protocolVersion,
        type,
        code: string(event.code, "code"),
        message: string(event.message, "message"),
      };
    case "description": {
      const description = record(event.description, "description");
      const describedProtocol = number(description.protocolVersion, "description.protocolVersion");
      if (describedProtocol !== HELPER_PROTOCOL_VERSION) {
        throw new Error(`Unsupported helper protocol version: ${describedProtocol}`);
      }
      const supportedTests = description.supportedTests;
      if (!Array.isArray(supportedTests) || supportedTests.some((test) => typeof test !== "string")) {
        throw new Error("Invalid helper event field: description.supportedTests");
      }
      return {
        protocolVersion,
        type,
        description: {
          protocolVersion: describedProtocol,
          methodologyVersion: string(description.methodologyVersion, "description.methodologyVersion"),
          supportedTests,
        },
      };
    }
    default:
      throw new Error(`Unknown helper event type: ${type}`);
  }
}

export function parseBenchmarkResult(value: unknown): BenchmarkResult {
  const result = record(value, "result");
  const confidence = string(result.confidence, "result.confidence");
  if (confidence !== "high" && confidence !== "medium" && confidence !== "low") {
    throw new Error(`Invalid benchmark confidence: ${confidence}`);
  }

  const volumeValue = result.volume;
  const volume = volumeValue === undefined ? undefined : benchmarkVolume(volumeValue);
  return {
    confidence,
    maxBytes: number(result.maxBytes, "result.maxBytes"),
    measuredBytes: number(result.measuredBytes, "result.measuredBytes"),
    methodologyVersion: string(result.methodologyVersion, "result.methodologyVersion"),
    read: measurement(result.read, "result.read"),
    write: measurement(result.write, "result.write"),
    ...(volume ? { volume } : {}),
  };
}

function measurement(value: unknown, field: string): BenchmarkMeasurement {
  const measured = record(value, field);
  return {
    durationSeconds: number(measured.durationSeconds, `${field}.durationSeconds`),
    megabytesPerSecond: number(measured.megabytesPerSecond, `${field}.megabytesPerSecond`),
    variation: number(measured.variation, `${field}.variation`),
  };
}

function benchmarkVolume(value: unknown): BenchmarkVolume {
  const volume = record(value, "result.volume");
  return {
    id: string(volume.id, "result.volume.id"),
    name: string(volume.name, "result.volume.name"),
  };
}

function benchmarkPhase(value: unknown): BenchmarkPhase {
  const phase = string(value, "phase");
  if (phase === "preparing" || phase === "warmup" || phase === "write" || phase === "read" || phase === "cleanup") {
    return phase;
  }
  throw new Error(`Unknown benchmark phase: ${phase}`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid helper event field: ${field}`);
  }
  return value as Record<string, unknown>;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid helper event field: ${field}`);
  }
  return value;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid helper event field: ${field}`);
  }
  return value;
}
