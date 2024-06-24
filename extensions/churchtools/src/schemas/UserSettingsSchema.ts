import { z } from "zod";

export const UserSettingsEntry = z.object({
  module: z.string(),
  attribute: z.string(),
  value: z.string().or(
    z.array(
      z.string().or(
        z.number().or(
          z.object({
            domainType: z.enum(["person", "group"]),
            domainIdentifier: z.string(),
          }),
        ),
      ),
    ),
  ),
});

export type UserSettingsEntryType = z.infer<typeof UserSettingsEntry>;
