import { z } from "zod";

export const DomainObjectSchema = z.object({
  domainIdentifier: z.string(),
  domainType: z.enum(["person", "group", "wiki_page", "song"]),
  title: z.string(),
  frontendUrl: z.string(),
  infos: z.array(z.string()),
  imageUrl: z.string().nullable(),
});

export type DomainObjectType = z.infer<typeof DomainObjectSchema>;
