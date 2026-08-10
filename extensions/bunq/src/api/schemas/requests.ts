/**
 * Request-related schemas (payment requests and bunq.me tabs).
 */

import { z } from "zod";
import {
  AmountSchema,
  PermissivePointerSchema,
  PaymentAliasSchema,
  AttachmentSchema,
  GeolocationSchema,
  AddressSchema,
} from "./base";
import { PaymentSchema } from "./payments";

// ============== Request Inquiry Schemas ==============

export const RequestInquirySchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "REVOKED", "EXPIRED"]),
    amount_inquired: AmountSchema,
    counterparty_alias: PermissivePointerSchema,
    description: z.string(),
    monetary_account_id: z.number(),
    time_expiry: z.string().nullish(),
    time_responded: z.string().nullish(),
    user_alias_created: PaymentAliasSchema.nullish(),
    user_alias_revoked: PaymentAliasSchema.nullish(),
    batch_id: z.number().nullish(),
    minimum_age: z.number().nullish(),
    require_address: z.string().nullish(),
    redirect_url: z.string().nullish(),
    bunqme_share_url: z.string().nullish(),
    merchant_reference: z.string().nullish(),
    attachment: z.array(AttachmentSchema).nullish(),
    address_shipping: AddressSchema.nullish(),
    address_billing: AddressSchema.nullish(),
    geolocation: GeolocationSchema.nullish(),
    allow_chat: z.boolean().nullish(),
    reference_split_the_bill: z.unknown().optional(),
  })
  .passthrough();

export const RequestInquiryResponseSchema = z
  .object({
    RequestInquiry: RequestInquirySchema,
  })
  .passthrough();

// ============== Request Inquiry Batch Schemas ==============

export const RequestInquiryBatchSchema = z
  .object({
    id: z.number().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    request_inquiries: z.array(RequestInquirySchema).optional(),
    status: z.string().optional(),
    total_amount_inquired: AmountSchema.optional(),
    reference_split_the_bill: z.unknown().optional(),
  })
  .passthrough();

export const RequestInquiryBatchResponseSchema = z
  .object({
    RequestInquiryBatch: RequestInquiryBatchSchema,
  })
  .passthrough();

// ============== Request Response Schemas (Incoming Requests) ==============

export const RequestResponseSchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "REVOKED"]),
    amount_inquired: AmountSchema.nullish(),
    amount_responded: AmountSchema.nullish(),
    counterparty_alias: PermissivePointerSchema,
    description: z.string(),
    monetary_account_id: z.number(),
    time_expiry: z.string().nullish(),
    time_responded: z.string().nullish(),
    user_alias_created: PaymentAliasSchema.nullish(),
    alias: PaymentAliasSchema.nullish(),
    address_shipping: AddressSchema.nullish(),
    address_billing: AddressSchema.nullish(),
    geolocation: GeolocationSchema.nullish(),
    redirect_url: z.string().nullish(),
    type: z.string().nullish(),
    sub_type: z.string().nullish(),
    attachment: z.array(AttachmentSchema).nullish(),
    minimum_age: z.number().nullish(),
    require_address: z.string().nullish(),
    bunqme_tab_entry: z.unknown().optional(),
    scheduled_id: z.number().nullish(),
    eligible_whitelist_id: z.number().nullish(),
    request_reference_split_the_bill: z.array(z.unknown()).nullish(),
  })
  .passthrough();

export const RequestResponseResponseSchema = z
  .object({
    RequestResponse: RequestResponseSchema,
  })
  .passthrough();

// ============== BunqMe Tab Schemas ==============

export const BunqMeTabEntrySchema = z
  .object({
    amount_inquired: AmountSchema.nullish(),
    description: z.string(),
    redirect_url: z.string().nullish(),
    uuid: z.string().nullish(),
    alias: PermissivePointerSchema.nullish(),
    merchant_reference: z.string().nullish(),
  })
  .passthrough();

export const BunqMeTabResultInquirySchema = z
  .object({
    payment: PaymentSchema,
  })
  .passthrough();

export const BunqMeTabSchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    status: z.enum(["WAITING_FOR_PAYMENT", "CANCELLED", "EXPIRED", "PAID"]),
    bunqme_tab_share_url: z.string(),
    bunqme_tab_entry: BunqMeTabEntrySchema,
    result_inquiries: z.array(BunqMeTabResultInquirySchema),
    time_expiry: z.string().optional(),
    monetary_account_id: z.number().optional(),
  })
  .passthrough();

export const BunqMeTabResponseSchema = z
  .object({
    BunqMeTab: BunqMeTabSchema,
  })
  .passthrough();

// ============== Type Exports ==============

export type RequestInquiry = z.infer<typeof RequestInquirySchema>;
export type RequestInquiryBatch = z.infer<typeof RequestInquiryBatchSchema>;
export type RequestResponse = z.infer<typeof RequestResponseSchema>;
export type BunqMeTab = z.infer<typeof BunqMeTabSchema>;
