/**
 * Monetary account-related schemas.
 */

import { z } from "zod";
import { AmountSchema, PointerSchema, AvatarSchema } from "./base";

// ============== Monetary Account Schemas ==============

export const MonetaryAccountSettingSchema = z
  .object({
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    default_avatar_status: z.string().nullable().optional(),
    restriction_chat: z.string().nullable().optional(),
  })
  .passthrough();

export const MonetaryAccountSchema = z
  .object({
    id: z.number(),
    description: z.string(),
    balance: AmountSchema,
    status: z.string(),
    currency: z.string(),
    alias: z.array(PointerSchema),
    created: z.string(),
    updated: z.string(),
    daily_limit: AmountSchema.optional(),
    daily_spent: AmountSchema.optional(),
    overdraft_limit: AmountSchema.optional(),
    avatar: AvatarSchema.optional(),
    setting: MonetaryAccountSettingSchema.optional(),
    public_uuid: z.string().optional(),
    user_id: z.number().optional(),
    monetary_account_profile: z.unknown().optional(),
    notification_filters: z.array(z.unknown()).optional(),
    reason: z.string().optional(),
    reason_description: z.string().optional(),
    sub_status: z.string().optional(),
  })
  .passthrough();

export const MonetaryAccountResponseSchema = z
  .object({
    MonetaryAccountBank: MonetaryAccountSchema.optional(),
    MonetaryAccountJoint: MonetaryAccountSchema.optional(),
    MonetaryAccountSavings: MonetaryAccountSchema.optional(),
    MonetaryAccountExternal: MonetaryAccountSchema.optional(),
    MonetaryAccountCard: MonetaryAccountSchema.optional(),
  })
  .passthrough();

// ============== Insight Schemas ==============

export const InsightCategorySchema = z
  .object({
    category: z.string(),
    category_translated: z.string(),
    total_amount: AmountSchema,
    number_of_transactions: z.number(),
  })
  .passthrough();

export const InsightsResponseSchema = z
  .object({
    InsightCategory: InsightCategorySchema,
  })
  .passthrough();

export const InsightPreferenceDateSchema = z
  .object({
    id: z.number().optional(),
    day_of_month: z.number().optional(),
  })
  .passthrough();

// ============== Customer Statement Schemas ==============

export const CustomerStatementSchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    status: z.enum(["PENDING", "AVAILABLE", "FAILED"]),
    statement_format: z.string().optional(),
    date_start: z.string().optional(),
    date_end: z.string().optional(),
    regional_format: z.string().optional(),
  })
  .passthrough();

export const CustomerStatementResponseSchema = z
  .object({
    CustomerStatement: CustomerStatementSchema,
  })
  .passthrough();

// ============== Type Exports ==============

export type MonetaryAccount = z.infer<typeof MonetaryAccountSchema>;
export type InsightCategory = z.infer<typeof InsightCategorySchema>;
export type CustomerStatement = z.infer<typeof CustomerStatementSchema>;
