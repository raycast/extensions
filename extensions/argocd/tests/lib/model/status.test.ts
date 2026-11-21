import { describe, expect, it } from "vitest";
import {
  healthSeverity,
  isAttentionWorthy,
  operationSeverity,
  parseHealth,
  parseOperationPhase,
  parseSync,
  syncSeverity,
} from "../../../src/lib/model/status";

describe("parseHealth", () => {
  it.each(["Healthy", "Progressing", "Degraded", "Suspended", "Missing", "Unknown"] as const)(
    "maps %s to itself",
    (value) => {
      expect(parseHealth(value)).toBe(value);
    },
  );

  it("falls back to Unknown", () => {
    expect(parseHealth(undefined)).toBe("Unknown");
    expect(parseHealth("Weird")).toBe("Unknown");
    expect(parseHealth("")).toBe("Unknown");
  });
});

describe("parseSync", () => {
  it("maps the known values", () => {
    expect(parseSync("Synced")).toBe("Synced");
    expect(parseSync("OutOfSync")).toBe("OutOfSync");
  });

  it("falls back to Unknown", () => {
    expect(parseSync(undefined)).toBe("Unknown");
    expect(parseSync("nope")).toBe("Unknown");
  });
});

describe("parseOperationPhase", () => {
  it("maps the known phases", () => {
    expect(parseOperationPhase("Succeeded")).toBe("Succeeded");
    expect(parseOperationPhase("Running")).toBe("Running");
    expect(parseOperationPhase("Terminating")).toBe("Terminating");
    expect(parseOperationPhase("Failed")).toBe("Failed");
    expect(parseOperationPhase("Error")).toBe("Error");
  });

  it("returns undefined when there is no usable phase", () => {
    expect(parseOperationPhase(undefined)).toBeUndefined();
    expect(parseOperationPhase("Pending")).toBeUndefined();
  });
});

describe("severity mapping", () => {
  it("maps health", () => {
    expect(healthSeverity("Healthy")).toBe("ok");
    expect(healthSeverity("Progressing")).toBe("info");
    expect(healthSeverity("Degraded")).toBe("error");
    expect(healthSeverity("Missing")).toBe("warn");
    expect(healthSeverity("Suspended")).toBe("muted");
    expect(healthSeverity("Unknown")).toBe("muted");
  });

  it("maps sync", () => {
    expect(syncSeverity("Synced")).toBe("ok");
    expect(syncSeverity("OutOfSync")).toBe("warn");
    expect(syncSeverity("Unknown")).toBe("muted");
  });

  it("maps operation phases", () => {
    expect(operationSeverity("Succeeded")).toBe("ok");
    expect(operationSeverity("Running")).toBe("info");
    expect(operationSeverity("Terminating")).toBe("warn");
    expect(operationSeverity("Failed")).toBe("error");
    expect(operationSeverity("Error")).toBe("error");
  });
});

describe("isAttentionWorthy", () => {
  it("flags degraded, missing and out-of-sync applications", () => {
    expect(isAttentionWorthy("Degraded", "Synced")).toBe(true);
    expect(isAttentionWorthy("Missing", "Synced")).toBe(true);
    expect(isAttentionWorthy("Healthy", "OutOfSync")).toBe(true);
  });

  it("leaves healthy and deliberately suspended applications alone", () => {
    expect(isAttentionWorthy("Healthy", "Synced")).toBe(false);
    expect(isAttentionWorthy("Suspended", "Synced")).toBe(false);
    expect(isAttentionWorthy("Progressing", "Synced")).toBe(false);
  });
});
