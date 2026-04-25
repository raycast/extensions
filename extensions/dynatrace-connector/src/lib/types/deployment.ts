// src/lib/types/deployment.ts
import { z } from "zod";

export const deploymentSchema = z.object({
  "event.id": z.string(),
  "event.name": z.string(),
  "event.type": z.string(),
  "event.start": z.string().datetime(),
  "event.provider": z.string().nullable().optional(),
  affected_entity_name: z.string().nullable().optional(),
  "deployment.version": z.string().nullable().optional(),
  "deployment.release_stage": z.string().nullable().optional(),
});

export type Deployment = z.infer<typeof deploymentSchema>;

export function buildDeploymentsQuery(): string {
  return `fetch events
    | filter event.type == "CUSTOM_DEPLOYMENT" or event.kind == "DAVIS_DEPLOYMENT"
    | sort event.start desc
    | limit 30`;
}
