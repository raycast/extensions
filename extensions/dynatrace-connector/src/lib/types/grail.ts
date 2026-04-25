// src/types/grail.ts
// Single source of truth for Dynatrace Grail API types and Zod schemas.

import { z } from "zod";

// ── Grail response schema ─────────────────────────────────────────────────────

export const grailResponseSchema = z.object({
  state: z.enum(["SUCCEEDED", "RUNNING", "FAILED"]),
  progress: z.number().optional(),
  result: z
    .object({
      records: z.array(z.record(z.string(), z.unknown())),
      types: z.array(
        z.object({
          indexRange: z.array(z.number()).length(2),
          mappings: z.record(z.string(), z.unknown()), // Dynatrace returns objects, not strings
        }),
      ),
      metadata: z
        .object({
          grail: z
            .object({
              query: z.string(),
              timezone: z.string(),
              locale: z.string(),
              analysisTimeframe: z
                .object({
                  start: z.string(),
                  end: z.string(),
                })
                .optional(),
            })
            .optional(),
          scannedBytes: z.number().optional(),
          scannedRecords: z.number().optional(),
          executionTimeMillis: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
  requestToken: z.string().optional(),
});

export type GrailResponse = z.infer<typeof grailResponseSchema>;

// ── Log record schema ─────────────────────────────────────────────────────────

export const logRecordSchema = z
  .object({
    timestamp: z.string(),
    content: z.string(),
    loglevel: z.string(), // "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | custom values
    status: z.string().optional(),

    // Service / App
    "service.name": z.string().optional(),
    "dt.app.name": z.string().optional(),
    "dt.app.version": z.string().optional(),

    // Host / Infrastructure
    "host.name": z.string().optional(),
    "dt.entity.host": z.string().optional(),
    "dt.host_group.id": z.string().optional(),

    // AWS
    "aws.region": z.string().optional(),
    "aws.availability_zone": z.string().optional(),
    "aws.account.id": z.string().optional(),
    "aws.arn": z.string().optional(),

    // Kubernetes
    "k8s.cluster.name": z.string().optional(),
    "k8s.namespace.name": z.string().optional(),
    "k8s.node.name": z.string().optional(),
    "k8s.pod.uid": z.string().optional(),

    // Process
    "dt.process.name": z.string().optional(),
    "dt.process_group.detected_name": z.string().optional(),
    "process.technology": z.union([z.string(), z.array(z.string())]).optional(),

    // Pipeline / Ingestion
    "dt.openpipeline.source": z.string().optional(),
    "dt.openpipeline.pipelines": z.union([z.string(), z.array(z.string())]).optional(),

    // Misc
    "event.type": z.string().optional(),
    "log.source": z.string().optional(),
    OperatorVersion: z.string().optional(),

    // Telemetry
    trace_id: z.string().optional(),
    span_id: z.string().optional(),
  })
  .catchall(z.unknown()); // Grail may return additional dynamic fields

export type LogRecord = z.infer<typeof logRecordSchema>;

// ── GrailRecord (alias for use in API layer) ──────────────────────────────────
export const grailRecordSchema = z.record(z.string(), z.unknown());
export type GrailRecord = z.infer<typeof grailRecordSchema>;
