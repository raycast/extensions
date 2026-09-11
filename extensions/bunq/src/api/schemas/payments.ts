/**
 * Payment-related schemas.
 */

import { z } from "zod";
import {
  AmountSchema,
  PointerSchema,
  PaymentAliasSchema,
  LabelMonetaryAccountSchema,
  AttachmentSchema,
  GeolocationSchema,
  AddressSchema,
} from "./base";

// ============== Payment Schemas ==============

export const PaymentSchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    amount: AmountSchema,
    description: z.string(),
    type: z.string(),
    sub_type: z.string().optional(),
    alias: PaymentAliasSchema,
    counterparty_alias: PaymentAliasSchema,
    monetary_account_id: z.number(),
    balance_after_mutation: AmountSchema.optional(),
    label_monetary_account: LabelMonetaryAccountSchema.optional(),
    attachment: z.array(AttachmentSchema).optional(),
    geolocation: GeolocationSchema.nullish(),
    merchant_reference: z.string().nullish(),
    bunqme_fundraiser_result: z.unknown().optional(),
    scheduled_id: z.number().nullish(),
    address_shipping: AddressSchema.nullish(),
    address_billing: AddressSchema.nullish(),
    allow_chat: z.boolean().optional(),
    request_reference_split_the_bill: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const PaymentResponseSchema = z
  .object({
    Payment: PaymentSchema,
  })
  .passthrough();

// ============== Draft Payment Schemas ==============

export const DraftPaymentEntrySchema = z
  .object({
    id: z.number().optional(),
    amount: AmountSchema,
    counterparty_alias: PointerSchema,
    description: z.string(),
    attachment: z.array(AttachmentSchema).optional(),
    merchant_reference: z.string().optional(),
  })
  .passthrough();

export const DraftPaymentSchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]),
    type: z.string().optional(),
    monetary_account_id: z.number(),
    user_alias_created: PaymentAliasSchema.optional(),
    responses: z.array(z.unknown()).optional(),
    entries: z.array(DraftPaymentEntrySchema),
    object: z.unknown().optional(),
    request_reference_split_the_bill: z.array(z.unknown()).optional(),
    schedule: z.unknown().optional(),
  })
  .passthrough();

export const DraftPaymentResponseSchema = z
  .object({
    DraftPayment: DraftPaymentSchema,
  })
  .passthrough();

// ============== Payment Batch Schemas ==============

export const PaymentBatchSchema = z
  .object({
    id: z.number().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    payments: z.array(PaymentSchema).optional(),
  })
  .passthrough();

export const PaymentBatchResponseSchema = z
  .object({
    PaymentBatch: PaymentBatchSchema,
  })
  .passthrough();

// ============== Scheduled Payment Schemas ==============

export const ScheduleSchema = z
  .object({
    time_start: z.string(),
    time_end: z.string().optional(),
    recurrence_unit: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    recurrence_size: z.number(),
  })
  .passthrough();

export const ScheduledPaymentSchema = z
  .object({
    id: z.number(),
    created: z.string(),
    updated: z.string(),
    status: z.enum(["ACTIVE", "FINISHED", "CANCELLED"]),
    payment: z
      .object({
        amount: AmountSchema,
        counterparty_alias: PointerSchema,
        description: z.string(),
        attachment: z.array(AttachmentSchema).optional(),
        merchant_reference: z.string().optional(),
      })
      .passthrough(),
    schedule: ScheduleSchema,
    monetary_account_id: z.number().optional(),
  })
  .passthrough();

export const ScheduledPaymentResponseSchema = z
  .object({
    ScheduledPayment: ScheduledPaymentSchema,
  })
  .passthrough();

// ============== Scheduled Payment Batch Schemas ==============

export const ScheduledPaymentBatchSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    payments: z.array(ScheduledPaymentSchema).optional(),
    schedule: ScheduleSchema.optional(),
  })
  .passthrough();

export const ScheduledPaymentBatchResponseSchema = z
  .object({
    ScheduledPaymentBatch: ScheduledPaymentBatchSchema,
  })
  .passthrough();

// ============== Type Exports ==============

export type Payment = z.infer<typeof PaymentSchema>;
export type DraftPayment = z.infer<typeof DraftPaymentSchema>;
export type DraftPaymentEntry = z.infer<typeof DraftPaymentEntrySchema>;
export type PaymentBatch = z.infer<typeof PaymentBatchSchema>;
export type ScheduledPayment = z.infer<typeof ScheduledPaymentSchema>;
export type ScheduledPaymentBatch = z.infer<typeof ScheduledPaymentBatchSchema>;
