import { array, object, string, union, undefined_ } from "valibot";
import type { Input } from "valibot";
export const response_schema = union([
  object({
    blocks: array(
      object({
        breadcrumbs: array(string()),
        href: string(),
        content: string(),
      }),
    ),
  }),
  undefined_(),
]);

export type ResponseType = Input<typeof response_schema>;
