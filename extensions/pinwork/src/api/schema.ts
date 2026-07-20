/**
 * Zod schemas for Pinwork JSON payloads.
 */

import { z } from "zod";

const booleanish = z.union([z.boolean(), z.string()]);
const numberish = z.union([z.number(), z.string()]);

export const rawTaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    notes: z.string().optional().nullable(),
    status: z.string().optional(),
    scheduledDate: z.string().optional().nullable(),
    scheduledDateHasTime: booleanish.optional(),
    deadline: z.string().optional().nullable(),
    estimate: numberish.optional().nullable(),
    projectId: z.string().optional().nullable(),
    projectName: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    isCompleted: booleanish.optional(),
    isRecurring: booleanish.optional(),
    createdAt: z.string().optional().nullable(),
    modifiedAt: z.string().optional().nullable(),
    completedAt: z.string().optional().nullable(),
  })
  .passthrough();

export const rawProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    taskCount: numberish.optional(),
    isArchived: booleanish.optional(),
  })
  .passthrough();

export const rawTagSchema = z
  .object({
    name: z.string(),
    taskCount: numberish.optional(),
  })
  .passthrough();

export const tasksPayloadSchema = z.union([
  z.array(rawTaskSchema),
  z.object({ tasks: z.array(rawTaskSchema) }),
]);

export const projectsPayloadSchema = z.union([
  z.array(rawProjectSchema),
  z.object({ projects: z.array(rawProjectSchema) }),
]);

export const tagsPayloadSchema = z.union([
  z.array(rawTagSchema),
  z.object({ tags: z.array(rawTagSchema) }),
]);
