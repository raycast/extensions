import { z } from "zod";

export const PermissionModeSchema = z.enum(["plan", "acceptEdits", "bypassPermissions", "default"]);
export type PermissionMode = z.infer<typeof PermissionModeSchema>;

export const WindowModeSchema = z.enum(["focused", "full"]);
export type WindowMode = z.infer<typeof WindowModeSchema>;

export const NewSessionParamsSchema = z
  .object({
    input: z.string().min(1).optional(),
    send: z.boolean().optional(),
    mode: PermissionModeSchema.optional(),
    workdir: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    systemPrompt: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    badges: z.array(z.unknown()).optional(),
    window: WindowModeSchema.optional(),
    sidebar: z.string().min(1).optional(),
  })
  .strict();
export type NewSessionParams = z.infer<typeof NewSessionParamsSchema>;

export const NewChatParamsSchema = z
  .object({
    input: z.string().min(1).optional(),
    send: z.boolean().optional(),
    name: z.string().min(1).optional(),
    window: WindowModeSchema.optional(),
  })
  .strict();
export type NewChatParams = z.infer<typeof NewChatParamsSchema>;

export const ActionKindSchema = z.enum([
  "new-session",
  "new-chat",
  "resume-sdk-session",
  "rename-session",
  "delete-session",
  "flag-session",
  "unflag-session",
  "oauth",
  "delete-source",
  "set-mode",
  "copy",
]);
export type ActionKind = z.infer<typeof ActionKindSchema>;

export const CompoundRouteHostSchema = z.enum([
  "allSessions",
  "flagged",
  "state",
  "sources",
  "settings",
  "skills",
]);
export type CompoundRouteHost = z.infer<typeof CompoundRouteHostSchema>;
