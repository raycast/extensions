/**
 * TransferWise/international transfer schemas.
 */

import { z } from "zod";
import { AmountSchema, PointerSchema } from "./base";

// ============== TransferWise Currency Schemas ==============

export const TransferWiseCurrencySchema = z
  .object({
    currency: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
  })
  .passthrough();

export const TransferWiseCurrencyResponseSchema = z
  .object({
    TransferwiseCurrency: TransferWiseCurrencySchema,
  })
  .passthrough();

// ============== TransferWise Quote Schemas ==============

export const TransferWiseQuoteSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    time_expiry: z.string().optional(),
    quote_id: z.string().optional(),
    amount_source: AmountSchema.optional(),
    amount_target: AmountSchema.optional(),
    rate: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const TransferWiseQuoteResponseSchema = z
  .object({
    TransferwiseQuote: TransferWiseQuoteSchema,
  })
  .passthrough();

// ============== TransferWise Transfer Schemas ==============

export const TransferWiseTransferSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    monetary_account_id: z.number().optional(),
    alias: PointerSchema.optional(),
    counterparty_alias: PointerSchema.optional(),
    amount_source: AmountSchema.optional(),
    amount_target: AmountSchema.optional(),
    rate: z.string().optional(),
    reference: z.string().optional(),
    status: z.string().optional(),
    pay_in_reference: z.string().optional(),
    time_delivery_estimate: z.string().optional(),
    quote: TransferWiseQuoteSchema.optional(),
  })
  .passthrough();

export const TransferWiseTransferResponseSchema = z
  .object({
    TransferwiseTransfer: TransferWiseTransferSchema,
  })
  .passthrough();

// ============== Type Exports ==============

export type TransferWiseCurrency = z.infer<typeof TransferWiseCurrencySchema>;
export type TransferWiseQuote = z.infer<typeof TransferWiseQuoteSchema>;
export type TransferWiseTransfer = z.infer<typeof TransferWiseTransferSchema>;
