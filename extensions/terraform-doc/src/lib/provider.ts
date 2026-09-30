import fetch from "node-fetch";
import { z } from "zod";

// https://registry.terraform.io/v2/provider-versions/46537?include=provider-docs

const providersResponseSchema = z.object({
  data: z.array(
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
        "full-name": z
          .string()
          .optional()
          .transform((v) => v || ""),
        "logo-url": z
          .string()
          .optional()
          .transform((v) => v || ""),
        name: z
          .string()
          .optional()
          .transform((v) => v || ""),
        namespace: z
          .string()
          .optional()
          .transform((v) => v || ""),
        "robots-noindex": z
          .boolean()
          .optional()
          .transform((v) => v || false),
        source: z
          .string()
          .optional()
          .transform((v) => v || ""),
        tier: z
          .string()
          .optional()
          .transform((v) => v || ""),
        warning: z
          .string()
          .optional()
          .transform((v) => v || ""),
      }),
    }),
  ),
  links: z.object({ next: z.string().nullable() }),
});

export type Provider = z.infer<typeof providersResponseSchema>["data"][0];

async function getProviderListRecursiveAPI(
  next: string = "/v2/providers?page%5Bsize%5D=100",
): Promise<Provider[]> {
  const data = await fetch(`https://registry.terraform.io${next}`);
  const res = providersResponseSchema.parse(await data.json());
  const providers: Provider[] = res.data;
  if (res.links.next !== null) {
    providers.push(...(await getProviderListRecursiveAPI(res.links.next)));
  }
  return providers;
}

export async function getProviderList(): Promise<Provider[]> {
  const prov = await getProviderListRecursiveAPI();
  // remove duplicates by id
  return (
    Array.from(new Map(prov.map((p) => [p.id, p])))
      .map((u) => u[1])
      // replace logo-url with full url
      .map((p) => {
        const attr = {
          ...p.attributes,
          "logo-url": p.attributes["logo-url"].match("^https://")
            ? p.attributes["logo-url"]
            : "https://registry.terraform.io" + p.attributes["logo-url"],
        };
        return { ...p, attributes: attr };
      })
      // sort by downloads
      .sort((a, b) => b.attributes.downloads - a.attributes.downloads)
  );
}
