import { z } from "zod";

/**
 * Centralized Zod schemas for every tool input. Each tool entry function
 * calls the matching schema's `.parse()` before doing anything else.
 *
 * Mutually-exclusive and conditional rules (e.g. `smart_send` xor `send_at`
 * xor `undo_timeout`, draft `instructions` vs `body`) live inside `.refine()`
 * clauses here so the behavior is testable in isolation.
 */

const Email = z
  .string()
  .trim()
  .min(1)
  .refine((s) => s.includes("@"), { message: "Must look like an email address (contain @)." });

const EmailList = z.union([z.string(), z.array(z.string())]);

const IanaTimezone = z
  .string()
  .min(1)
  .refine((s) => /^[A-Za-z_]+\/[A-Za-z0-9_+\-/]+$|^UTC$/.test(s), {
    message: "Expected IANA timezone like 'America/New_York' or 'UTC'.",
  });

const Rfc3339 = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Expected an RFC3339 / ISO 8601 datetime." });

// ───── draft-email ─────
export const DraftEmailInput = z
  .object({
    draftId: z.string().optional(),
    type: z.enum(["new", "reply", "reply_all", "forward"]).optional(),
    threadId: z.string().optional(),
    messageId: z.string().optional(),
    from: z.string().optional(),
    recipient: EmailList.optional(),
    cc: EmailList.optional(),
    bcc: EmailList.optional(),
    subject: z.string().optional(),
    instructions: z.string().optional(),
    body: z.string().optional(),
  })
  .refine((v) => Boolean(v.instructions || v.body), {
    message: "Provide either `instructions` (preferred, AI-written) or `body` (literal HTML).",
    path: ["instructions"],
  })
  .refine((v) => v.type !== "forward" || Boolean(v.body), {
    message: "Forward drafts require `body` for the intro; the server appends the quoted message.",
    path: ["body"],
  });
export type DraftEmailInputType = z.infer<typeof DraftEmailInput>;

// ───── send-draft ─────
export const SendDraftInput = z
  .object({
    draftId: z.string().min(1),
    smartSend: z.boolean().optional(),
    sendAt: Rfc3339.optional(),
    undoTimeout: z.number().int().min(1).max(10).optional(),
  })
  .refine((v) => [v.smartSend, v.sendAt, v.undoTimeout].filter((x) => x !== undefined && x !== false).length <= 1, {
    message: "Provide at most one of `smartSend`, `sendAt`, or `undoTimeout` — they are mutually exclusive.",
    path: ["smartSend"],
  });
export type SendDraftInputType = z.infer<typeof SendDraftInput>;

// ───── undo-send ─────
export const UndoSendInput = z
  .object({
    undoToken: z.string().optional(),
    messageId: z.string().optional(),
  })
  .refine((v) => Boolean(v.undoToken || v.messageId), {
    message: "Provide `undoToken` (preferred) or `messageId`.",
    path: ["undoToken"],
  });
export type UndoSendInputType = z.infer<typeof UndoSendInput>;

// ───── discard-draft ─────
export const DiscardDraftInput = z.object({ draftId: z.string().min(1) });
export type DiscardDraftInputType = z.infer<typeof DiscardDraftInput>;

// ───── list-threads ─────
export const ListThreadsInput = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  from: z.array(z.string()).optional(),
  to: z.array(z.string()).optional(),
  subjectContains: z.string().optional(),
  bodyContains: z.string().optional(),
  labels: z.array(z.string()).optional(),
  // Deprecated single-label form, mapped to `labels` internally.
  label: z.string().optional(),
  split: z.string().optional(),
  startDate: Rfc3339.optional(),
  endDate: Rfc3339.optional(),
  isUnread: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  hasAttachment: z.boolean().optional(),
});
export type ListThreadsInputType = z.infer<typeof ListThreadsInput>;

// ───── get-thread ─────
export const GetThreadInput = z.object({
  threadId: z.string().min(1),
  includeComments: z.boolean().optional(),
  includeDrafts: z.boolean().optional(),
  messageLimit: z.number().int().min(1).max(100).optional(),
});
export type GetThreadInputType = z.infer<typeof GetThreadInput>;

// ───── get-message ─────
export const GetMessageInput = z.object({
  messageId: z.string().min(1),
  includeRawHtml: z.boolean().optional(),
});
export type GetMessageInputType = z.infer<typeof GetMessageInput>;

// ───── get-attachment ─────
export const GetAttachmentInput = z.object({
  messageId: z.string().min(1),
  attachmentName: z.string().optional(),
  // Deprecated; kept for backward compatibility.
  attachmentId: z.string().optional(),
});
export type GetAttachmentInputType = z.infer<typeof GetAttachmentInput>;

// ───── get-read-status-feed ─────
export const GetReadStatusFeedInput = z.object({
  threadId: z.string().optional(),
  since: Rfc3339.optional(),
  limit: z.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
});
export type GetReadStatusFeedInputType = z.infer<typeof GetReadStatusFeedInput>;

// ───── update-thread ─────
export const UpdateThreadInput = z.object({
  threadId: z.string().min(1),
  lastMessageId: z.string().optional(),
  markDone: z.boolean().optional(),
  markRead: z.boolean().optional(),
  markStarred: z.boolean().optional(),
  markImportant: z.boolean().optional(),
  addLabels: z.array(z.string()).optional(),
  removeLabels: z.array(z.string()).optional(),
  moveToFolder: z.string().optional(),
  // Deprecated aliases mapped to the canonical fields above.
  archived: z.boolean().optional(),
  read: z.boolean().optional(),
  starred: z.boolean().optional(),
});
export type UpdateThreadInputType = z.infer<typeof UpdateThreadInput>;

// ───── mark-spam ─────
export const MarkSpamInput = z.object({
  threadId: z.string().min(1),
  alsoBlockSender: z.boolean().optional(),
  alsoBlockDomain: z.boolean().optional(),
  alsoTrash: z.boolean().optional(),
});
export type MarkSpamInputType = z.infer<typeof MarkSpamInput>;

// ───── trash-thread ─────
export const TrashThreadInput = z.object({ threadId: z.string().min(1) });
export type TrashThreadInputType = z.infer<typeof TrashThreadInput>;

// ───── unsubscribe ─────
export const UnsubscribeInput = z.object({ threadId: z.string().min(1) });
export type UnsubscribeInputType = z.infer<typeof UnsubscribeInput>;

// ───── update-personalization ─────
export const UpdatePersonalizationInput = z.object({
  feedback: z.string().min(1, "Provide a non-empty feedback string."),
});
export type UpdatePersonalizationInputType = z.infer<typeof UpdatePersonalizationInput>;

// ───── create-or-update-event ─────
export const CreateOrUpdateEventInput = z.object({
  eventId: z.string().optional(),
  calendarId: z.string().optional(),
  title: z.string().optional(),
  start: Rfc3339.optional(),
  end: Rfc3339.optional(),
  timezone: IanaTimezone,
  attendees: z.array(Email).optional(),
  conference: z.boolean().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().optional(),
  // Deprecated alias.
  allDay: z.boolean().optional(),
  recurrence: z.string().optional(),
  reminders: z.array(z.object({ method: z.enum(["email", "popup"]), minutes: z.number().int().min(0) })).optional(),
});
export type CreateOrUpdateEventInputType = z.infer<typeof CreateOrUpdateEventInput>;

// ───── get-availability ─────
export const GetAvailabilityInput = z
  .object({
    participants: z.array(z.string()).optional(),
    // Deprecated alias.
    attendees: z.array(z.string()).optional(),
    startDate: Rfc3339.optional(),
    endDate: Rfc3339.optional(),
    // Deprecated alias for startDate/endDate.
    start: Rfc3339.optional(),
    end: Rfc3339.optional(),
    timezone: IanaTimezone,
    durationMinutes: z.number().int().min(1).optional(),
    workingHoursOnly: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.startDate || v.start), {
    message: "Provide `startDate` (or legacy `start`).",
    path: ["startDate"],
  })
  .refine((v) => Boolean(v.endDate || v.end), {
    message: "Provide `endDate` (or legacy `end`).",
    path: ["endDate"],
  });
export type GetAvailabilityInputType = z.infer<typeof GetAvailabilityInput>;

// ───── query-email-and-calendar ─────
export const QueryEmailAndCalendarInput = z.object({
  query: z.string().min(1, "Provide a non-empty natural-language query."),
});
export type QueryEmailAndCalendarInputType = z.infer<typeof QueryEmailAndCalendarInput>;

/**
 * Validate input against a schema and rethrow Zod errors as Error messages
 * the AI surface can render cleanly. Returns the parsed (possibly coerced)
 * value.
 */
export function validate<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  throw new Error(`Invalid input: ${issues}`);
}
