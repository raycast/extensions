import fetch from "node-fetch";
import { z } from "zod";
import { Provider } from "./provider";

const providerVersionsResponseSchema = z.object({
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
        downloads: z
          .number()
          .optional()
          .transform((v) => v || 0),
        "published-at": z.coerce
          .date()
          .optional()
          .transform((v) => v || new Date(0)),
        tag: z
          .string()
          .optional()
          .transform((v) => v || ""),
        version: z
          .string()
          .optional()
          .transform((v) => v || ""),
      }),
    }),
  ),
});

export type ProviderVersion = z.infer<
  typeof providerVersionsResponseSchema
>["included"][0];

export async function getProviderVersionList(provider: Provider) {
  try {
    const data = await fetch(
      `https://registry.terraform.io/v2/providers/${provider.attributes["full-name"]}?include=provider-versions`,
    );
    const res = providerVersionsResponseSchema.parse(await data.json());
    return res.included.sort(
      (a, b) =>
        b.attributes["published-at"].getTime() -
        a.attributes["published-at"].getTime(),
    );
  } catch (e) {
    throw new Error(`${e}`);
  }
}
