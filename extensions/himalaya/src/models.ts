// [
//   {
//     "id": "160215",
//     "flags": [],
//     "subject": "Into the Sun by Astronaut Husband and more new music for you",
//     "from": {
//       "name": "Bandcamp",
//       "addr": "noreply@bandcamp.com"
//     },
//     "to": {
//       "name": "Jesse",
//       "addr": "jesse.claven@me.com"
//     },
//     "date": "2025-04-04 18:51+00:00",
//     "has_attachment": false
//   }
// ]
import { z } from "zod";

enum Flags {
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
});

export type Envelope = z.infer<typeof Envelope>;
