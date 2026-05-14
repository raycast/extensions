import z from "zod";
import { StackFieldTypeEnum } from "../types";

export const StackFieldTypeSchema = z.nativeEnum(StackFieldTypeEnum);

export const LabelSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export const MetadataSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StackFieldInputSchema = z.object({
  label: LabelSchema,
  description: z.string().min(1),
  type: StackFieldTypeSchema,
  isTitleField: z.boolean(),
});

export const StackFieldSchema = StackFieldInputSchema.merge(MetadataSchema);

export const StackInputSchema = z.object({
  name: LabelSchema,
  icon: z.string().min(1),
  description: z.string().min(1),
});

export const StackSchema = StackInputSchema.merge(MetadataSchema).extend({
  fields: z.array(StackFieldSchema),
  version: z.number().int().nonnegative(),
});

export const CaptureDataSchema = z.record(z.string(), z.object({ value: z.string(), type: StackFieldTypeSchema }));

export const CaptureStackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().nonnegative(),
});

export const CaptureSchema = z.object({
  id: z.string().min(1),
  stack: CaptureStackSchema,
  title: z.string().min(1),
  imagePath: z.string().min(1),
  data: CaptureDataSchema,
  createdAt: z.string().datetime(),
});
