// [
//   {
//     "id": "160215",
//     "flags": [],
//     "subject": "<redacted>",
//     "from": {
//       "name": "<redacted>",
//       "addr": "<redacted>@<redacted>.com"
//     },
//     "to": {
//       "name": "Jesse",
//       "addr": "<redacted>@<redacted>.com"
//     },
//     "date": "2025-04-04 18:51+00:00",
//     "has_attachment": false
//   }
// ]
import { z } from "zod";

export enum Flags {
  Seen = "Seen",
  Answered = "Answered",
  Flagged = "Flagged",
  Deleted = "Deleted",
  Draft = "Draft",
  Recent = "Recent",
}

const FlagEnum = z.nativeEnum(Flags);

export const Address = z.object({
  name: z.string().nullable().optional(),
  addr: z.string().nullable().optional(),
});

export const Envelope = z.object({
  id: z.string(),
  flags: z.array(FlagEnum).nullable().optional().default([]),
  subject: z.string().nullable().optional().default(""),
  from: Address.nullable().optional(),
  to: Address.nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?:[+-]\d{2}:\d{2}|[+-]\d{4}|\+00:00)$/)
    .nullable()
    .optional(),
  has_attachment: z.boolean().nullable().optional().default(false),
  folder_name: z.string().optional(),
});

export type Envelope = z.infer<typeof Envelope>;

export const Folder = z.object({
  name: z.string(),
  desc: z.string(),
});

export type Folder = z.infer<typeof Folder>;
