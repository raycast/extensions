import { z } from 'zod';

const __ServiceErrorSchema = z.object({
  Code: z.string().optional(),
  Data: z.any().optional(),
  Message: z.string().optional(),
  RequestID: z.string().optional(),
  Type: z.string().optional(),
});
export const ServiceErrorSchema = __ServiceErrorSchema;


