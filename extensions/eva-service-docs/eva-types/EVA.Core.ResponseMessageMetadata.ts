import { z } from 'zod';

const __ResponseMessageMetadataSchema = z.object({
  ExternalIDs: z.record(z.string(), z.record(z.string(), z.string().nullable()).nullable()).optional(),
  IsAsyncResultAvailable: z.boolean().optional(),
  UnresolvedExternalIDs: z.record(z.string(), z.array(z.string()).nullable()).optional(),
});
export const ResponseMessageMetadataSchema = __ResponseMessageMetadataSchema;


