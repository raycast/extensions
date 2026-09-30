/**
 * Card-related schemas.
 */

import { z } from "zod";
import { AmountSchema, PaymentAliasSchema } from "./base";

// ============== Card Schemas ==============

export const CardLimitSchema = z
  .object({
    daily_limit: z.string().optional(),
    currency: z.string().optional(),
    type: z.string().optional(),
    id: z.number().optional(),
  })
  .passthrough();

export const CardCountryPermissionSchema = z
  .object({
    country: z.string().optional(),
    id: z.number().optional(),
    expiry_time: z.string().optional(),
  })
  .passthrough();

export const PinCodeAssignmentSchema = z
  .object({
    type: z.string().optional(),
    routing_type: z.string().optional(),
    monetary_account_id: z.number().optional(),
  })
  .passthrough();

export const CardLabelMonetaryAccountSchema = z
  .object({
    iban: z.string().optional(),
    display_name: z.string().optional(),
  })
  .passthrough();

export const CardMagStripePermissionSchema = z
  .object({
    expiry_time: z.string().optional(),
  })
  .passthrough();

export const CardSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    status: z.string().optional(),
    sub_status: z.string().optional(),
    type: z.string().optional(),
    sub_type: z.string().optional(),
    product_type: z.string().optional(),
    second_line: z.string().optional(),
    name_on_card: z.string().optional(),
    description: z.string().optional(),
    primary_account_number_four_digit: z.string().optional(),
    expiry_date: z.string().optional(),
    label_monetary_account_current: CardLabelMonetaryAccountSchema.optional(),
    label_monetary_account_ordered: CardLabelMonetaryAccountSchema.optional(),
    limit: z.array(CardLimitSchema).optional(),
    country_permission: z.array(CardCountryPermissionSchema).optional(),
    card_type: z.string().optional(),
    is_virtual: z.boolean().optional(),
    pin_code_assignment: z.array(PinCodeAssignmentSchema).optional(),
    mag_stripe_permission: CardMagStripePermissionSchema.optional(),
    order_status: z.string().optional(),
    public_uuid: z.string().optional(),
  })
  .passthrough();

export const CardResponseSchema = z
  .object({
    CardDebit: CardSchema.optional(),
    CardCredit: CardSchema.optional(),
    CardPrepaid: CardSchema.optional(),
    CardMaestro: CardSchema.optional(),
  })
  .passthrough();

// ============== Generated CVC2 Schema ==============

export const GeneratedCvc2Schema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    cvc2: z.string(),
    status: z.string().optional(),
    expiry_time: z.string().optional(),
  })
  .passthrough();

export const GeneratedCvc2ResponseSchema = z
  .object({
    CardGeneratedCvc2: GeneratedCvc2Schema,
  })
  .passthrough();

// ============== Mastercard Action Schemas ==============

export const MastercardActionSchema = z
  .object({
    id: z.number(),
    created: z.string().nullish(),
    updated: z.string().nullish(),
    monetary_account_id: z.number().nullish(),
    card_id: z.number().nullish(),
    amount_local: AmountSchema.nullish(),
    amount_billing: AmountSchema.nullish(),
    amount_original_local: AmountSchema.nullish(),
    amount_original_billing: AmountSchema.nullish(),
    amount_fee: AmountSchema.nullish(),
    decision: z.string().nullish(),
    decision_description: z.string().nullish(),
    decision_description_translated: z.string().nullish(),
    description: z.string().nullish(),
    authorisation_status: z.string().nullish(),
    authorisation_type: z.string().nullish(),
    pan_entry_mode_user: z.string().nullish(),
    city: z.string().nullish(),
    alias: PaymentAliasSchema.nullish(),
    counterparty_alias: PaymentAliasSchema.nullish(),
    label_card: z
      .object({
        uuid: z.string().nullish(),
        type: z.string().nullish(),
        second_line: z.string().nullish(),
        expiry_date: z.string().nullish(),
        status: z.string().nullish(),
        label_user: z.unknown().nullish(),
      })
      .passthrough()
      .nullish(),
    token_status: z.string().nullish(),
    reservation_expiry_time: z.string().nullish(),
    clearing_status: z.string().nullish(),
    maturity_date: z.string().nullish(),
    card_authorisation_id_response: z.string().nullish(),
    applied_limit: z.string().nullish(),
    secure_code_id: z.number().nullish(),
    wallet_provider_id: z.string().nullish(),
    request_reference_split_the_bill: z.array(z.unknown()).nullish(),
    all_mastercard_action_refund: z.array(z.unknown()).nullish(),
    pos_card_presence: z.string().nullish(),
    pos_card_holder_presence: z.string().nullish(),
    eligible_whitelist_id: z.number().nullish(),
    cashback_payout_item: z.unknown().nullish(),
    blacklist: z.unknown().nullish(),
    additional_authentication_status: z.string().nullish(),
    pin_status: z.string().nullish(),
  })
  .passthrough();

export const MastercardActionResponseSchema = z
  .object({
    MasterCardAction: MastercardActionSchema,
  })
  .passthrough();

// ============== Type Exports ==============

export type Card = z.infer<typeof CardSchema>;
export type GeneratedCvc2 = z.infer<typeof GeneratedCvc2Schema>;
export type MastercardAction = z.infer<typeof MastercardActionSchema>;
