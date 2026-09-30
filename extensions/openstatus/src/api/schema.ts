import { z } from "zod";

export const monitorPeriodicity = ["30s", "1m", "5m", "10m", "30m", "1h", "other"] as const;

export const monitorJobTypes = ["http", "tcp", "imcp", "udp", "dns", "ssl"] as const;

export const monitorPeriodicitySchema = z.enum(monitorPeriodicity);

export const monitorSchema = z.object({
  id: z.number(),
  description: z.string(),
  url: z.string(),
  periodicity: monitorPeriodicitySchema,
  regions: z.array(z.string()),
  name: z.string(),
  active: z.boolean(),
  public: z.boolean(),
  jobType: z.string(),
});

export type Monitor = z.infer<typeof monitorSchema>;

export const WhoamiSchema = z.object({
  name: z.string(),
  slug: z.string(),
});

export const StatusEnum = ["investigating", "identified", "monitoring", "resolved"] as const;

export const StatusReportCreateSchema = z.object({
  title: z.string(),
  status: z.enum(StatusEnum),
  monitorIds: z.array(z.number()),
  pageId: z.number(),
  date: z.coerce.date().nullable(),
  message: z.string(),
});

export const StatusReportUpdateSchema = z.object({
  status: z.enum(StatusEnum),
  message: z.string(),
  statusReportId: z.number(),
  date: z.coerce.date().nullable(),
});

export type StatusReportUpdate = z.infer<typeof StatusReportUpdateSchema>;
export const StatusReportSchema = z
  .object({
    id: z.number(),
  })
  .merge(
    StatusReportCreateSchema.omit({
      monitorIds: true,
      date: true,
      message: true,
    }),
  );

export type StatusReport = z.infer<typeof StatusReportCreateSchema>;

export const pageSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  customDomain: z.string().optional().nullable(),
});

export type Page = z.infer<typeof pageSchema>;

// Incidents
export const incidentSchema = z.object({
  id: z.number(),
  startedAt: z.string(),
  monitorId: z.number(),
  acknowledgedAt: z.string().nullable(),
  acknowledgedBy: z.number().nullable(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.number().nullable(),
});
export type Incident = z.infer<typeof incidentSchema>;
