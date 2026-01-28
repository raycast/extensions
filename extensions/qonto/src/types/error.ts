import { z } from "zod";

// doc: https://api-doc.qonto.com/docs/business-api/7b02610b69d70-show-organization
//

// prettier-ignore
export const ErrorDetailSchema = z.object({
  errors: z.array(
    z.object({
      code: z.string(),     // "unauthorized",
      detail: z.string(),   // "You must be authenticated to perform this action"
    })
  ),
});

// prettier-ignore
export const ErrorMessageSchema = z.object({
  errors: z.array(
    z.object({
      code: z.string(),     // "unauthorized",
      message: z.string(),  // "You must be authenticated to perform this action"
    })
  ),
});

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
