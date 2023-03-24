import { useFetch } from "@raycast/utils";
import { z } from "zod";

const reactPropSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().nullable(),
  deprecated: z.boolean().nullable(),
  description: z.string().nullable(),
  defaultValue: z.string().nullable(),
});

const componentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  implementations: z.object({
    react: z
      .object({
        name: z.string(),
        status: z.string(),
        a11yReviewed: z.boolean(),
        props: z.array(reactPropSchema),
        subcomponents: z
          .array(
            z.object({
              name: z.string(),
              props: z.array(reactPropSchema),
            })
          )
          .nullable(),
      })
      .nullable(),
  }),
});

const componentsSchema = z.object({
  components: z.array(componentSchema),
});

export type Component = z.infer<typeof componentSchema>;
export type ReactProp = z.infer<typeof reactPropSchema>;

export function useComponentData() {
  // TODO: Replace this with primer.style/design URL after merging https://github.com/primer/design/pull/425
  const { isLoading, error, data } = useFetch(
    "https://primer-5dd8f1e892-26441320.drafts.github.io/components.json"
  );

  const { components = [] } = data ? componentsSchema.parse(data) : {};

  return { isLoading, error, components };
}
