import * as v from "valibot";

export const response_schema = v.union([
  v.object({
    blocks: v.array(
      v.object({
        breadcrumbs: v.array(v.string()),
        href: v.string(),
        content: v.string(),
      }),
    ),
  }),
  v.undefined_(),
]);

export type ResponseType = v.InferInput<typeof response_schema>;
