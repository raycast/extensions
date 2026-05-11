import { z } from "zod";
import { Provider } from "./provider";
import fetch from "node-fetch";
import { ProviderVersion } from "./provider-version";

const resourceSchema = z.object({
  included: z.array(
    z.object({
      type: z
        .string()
        .optional()
        .transform((v) => v || ""),
      id: z
        .string()
        .optional()
        .transform((v) => v || ""),
      attributes: z.object({
        category: z
          .string()
          .optional()
          .transform((v) => v || ""),
        language: z
          .string()
          .optional()
          .transform((v) => v || ""),
        path: z
          .string()
          .optional()
          .transform((v) => v || ""),
        slug: z
          .string()
          .optional()
          .transform((v) => v || ""),
        subcategory: z.string().nullable(),
        title: z
          .string()
          .optional()
          .transform((v) => v || ""),
      }),
    }),
  ),
});

export type Resource = z.infer<typeof resourceSchema>["included"][0];

export async function getResourceList(
  provider: Provider,
  version: ProviderVersion,
): Promise<Resource[] | undefined> {
  try {
    const data = await fetch(
      `https://registry.terraform.io/v2/provider-versions/${version.id}?include=provider-docs%2Chas-cdktf-docs`,
    );
    const resources = resourceSchema.parse(await data.json()).included;
    return resources;
  } catch (e) {
    return undefined;
  }
}
