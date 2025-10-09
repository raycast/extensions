import { Icon } from "@raycast/api";
import { z } from "zod";

export const PrototypeTypeEnum = z.enum([
  "jira",
  "front",
  "github",
  "helpscout",
  "hubspot",
  "intercom",
  "monday",
  "notion",
  "raycast",
  "zendesk",
  "attio",
  "linear",
  "chrome",
  "canny",
  "featurebase",
  "chatprd",
  "other",
]);

export const PrototypeIconEnum = z.enum([
  Icon.Tag,
  Icon.Tack,
  Icon.TwoPeople,
  Icon.BlankDocument,
  Icon.Ellipsis,
  Icon.RaycastLogoPos,
]);

export type PrototypeType = z.infer<typeof PrototypeTypeEnum>;

export type PrototypeIcon = z.infer<typeof PrototypeIconEnum>;

export const PrototypeTypeToIcon = (type: PrototypeType): PrototypeIcon => {
  switch (type) {
    case "jira":
      return Icon.Tag;
    case "front":
      return Icon.Tack;
    case "github":
      return Icon.TwoPeople;
    case "helpscout":
      return Icon.BlankDocument;
    case "hubspot":
      return Icon.TwoPeople;
    case "intercom":
      return Icon.BlankDocument;
    case "monday":
      return Icon.TwoPeople;
    case "notion":
      return Icon.BlankDocument;
    case "raycast":
      return Icon.RaycastLogoPos;
    case "zendesk":
      return Icon.BlankDocument;
    case "attio":
      return Icon.TwoPeople;
    case "linear":
      return Icon.BlankDocument;
    case "chrome":
      return Icon.Ellipsis;
    case "canny":
      return Icon.BlankDocument;
    case "featurebase":
      return Icon.TwoPeople;
    case "chatprd":
      return Icon.BlankDocument;
    case "other":
      return Icon.Tag;
    default:
      return Icon.Tag;
  }
};

export const PrototypeBaseSchema = z.object({
  prototypeId: z.string(),
  title: z.string().optional(),
  workspace: z.string().optional(),
  createdBy: z.object({
    name: z.string(),
    email: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
  createdAt: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  alloyUrl: z.string(),
  type: PrototypeTypeEnum,
});

export const PrototypeForDetailsSchema = PrototypeBaseSchema.extend({
  prompt: z.string().optional(),
  alloyPreviewImageUrl: z.string().optional(),
});

export const PrototypeCreateSchema = z.object({
  prompt: z.string(),
});

export const PrototypeCreateResultSchema = z.object({
  prototypeId: z.string(),
  alloyUrl: z.string(),
  workspaceId: z.string(),
  createdAt: z.date(),
});

export const PrototypeForListSchema = PrototypeBaseSchema;

export type PrototypeForList = z.infer<typeof PrototypeForListSchema>;

export type PrototypeForDetails = z.infer<typeof PrototypeForDetailsSchema>;

export type PrototypeCreate = z.infer<typeof PrototypeCreateSchema>;

export type PrototypeCreateResult = z.infer<typeof PrototypeCreateResultSchema>;
