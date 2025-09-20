import { z } from "zod";

export const datasourceSchema = z.object({
  id: z.string({ coerce: true }),
  orgId: z.string({ coerce: true }),
  uid: z.string(),
  name: z.string(),
  type: z.string(),
  typeLogoUrl: z.string(),
  typeName: z.string().optional(),
  url: z.string(),
  database: z.string(),
  isDefault: z.boolean(),
  readOnly: z.boolean(),
  // Data we don't care for now, could be added in the future:
  // basicAuth: z.boolean(),
  // jsonData: z
  //   .object({
  //     logLevelField: z.string().optional(),
  //     logMessageField: z.string().optional(),
  //     maxConcurrentShardRequests: z.number().optional(),
  //     timeField: z.string().optional(),
  //     // potentially other fields, such as httpHeaderName1
  //     // but not relevant for this Command.
  //   })
  //   .optional(),
  password: z.string().optional(),
  user: z.string(),
  access: z.string(),
});
export const datasourcesSchema = z.array(datasourceSchema);
