/**
 * Miscellaneous schemas (events, shares, notifications, invoices, auth, etc).
 */

import { z } from "zod";
import { AmountSchema, PermissivePointerSchema, PaymentAliasSchema, AddressSchema } from "./base";

// ============== Event Schemas ==============

export const EventSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    action: z.string().optional(),
    user_id: z.number().nullish(),
    monetary_account_id: z.union([z.number(), z.string()]).nullish(),
    object: z.unknown().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const EventResponseSchema = z
  .object({
    Event: EventSchema,
  })
  .passthrough();

// ============== Share Invite Schemas ==============

export const ShareDetailSchema = z
  .object({
    payment: z
      .object({
        make_payments: z.boolean().optional(),
        make_draft_payments: z.boolean().optional(),
        view_balance: z.boolean().optional(),
        view_old_events: z.boolean().optional(),
        view_new_events: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    read_only: z
      .object({
        view_balance: z.boolean().optional(),
        view_old_events: z.boolean().optional(),
        view_new_events: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    draft_payment: z
      .object({
        make_draft_payments: z.boolean().optional(),
        view_balance: z.boolean().optional(),
        view_old_events: z.boolean().optional(),
        view_new_events: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const ShareInviteMonetaryAccountInquirySchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    alias: PermissivePointerSchema.nullish(),
    user_alias_created: PaymentAliasSchema.nullish(),
    user_alias_revoked: PaymentAliasSchema.nullish(),
    counter_user_alias: PaymentAliasSchema.nullish(),
    monetary_account_id: z.number().optional(),
    status: z.string().optional(),
    share_type: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    share_detail: ShareDetailSchema.optional(),
  })
  .passthrough();

export const ShareInviteMonetaryAccountResponseSchema = z
  .object({
    ShareInviteMonetaryAccountInquiry: ShareInviteMonetaryAccountInquirySchema.optional(),
    ShareInviteMonetaryAccountResponse: ShareInviteMonetaryAccountInquirySchema.optional(),
  })
  .passthrough();

// ============== Notification Filter Schemas ==============

export const NotificationFilterUrlSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    notification_target: z.string(),
    category: z.string(),
    notification_delivery_method: z.string().optional(),
    object_type: z.string().optional(),
    user_id: z.number().optional(),
    monetary_account_id: z.number().optional(),
  })
  .passthrough();

export const NotificationFilterUrlResponseSchema = z
  .object({
    NotificationFilterUrl: NotificationFilterUrlSchema,
  })
  .passthrough();

export const NotificationFilterPushSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    category: z.string(),
  })
  .passthrough();

export const NotificationFilterPushResponseSchema = z
  .object({
    NotificationFilterPush: NotificationFilterPushSchema,
  })
  .passthrough();

// ============== Invoice Schemas ==============

export const InvoiceItemSchema = z
  .object({
    billing_date: z.string().optional(),
    description: z.string().optional(),
    type_description: z.string().optional(),
    type_description_translated: z.string().optional(),
    unit_vat_exclusive: AmountSchema.optional(),
    unit_vat_inclusive: AmountSchema.optional(),
    vat: z.union([z.string(), z.number()]).optional(),
    quantity: z.union([z.string(), z.number()]).optional(),
    total_vat_exclusive: AmountSchema.optional(),
    total_vat_inclusive: AmountSchema.optional(),
  })
  .passthrough();

/**
 * Permissive pointer schema for invoice contexts where fields can be undefined.
 */
export const InvoicePointerSchema = z
  .object({
    type: z.string().nullish(),
    value: z.string().nullish(),
    name: z.string().nullish(),
  })
  .passthrough();

export const InvoiceSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    invoice_date: z.string().optional(),
    invoice_number: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
    category: z.string().optional(),
    total_vat_exclusive: AmountSchema.optional(),
    total_vat_inclusive: AmountSchema.optional(),
    group: z
      .array(
        z
          .object({
            type: z.string().optional(),
            type_description: z.string().optional(),
            type_description_translated: z.string().optional(),
            instance_description: z.string().optional(),
            product_vat_exclusive: AmountSchema.optional(),
            product_vat_inclusive: AmountSchema.optional(),
            item: z.array(InvoiceItemSchema).optional(),
          })
          .passthrough(),
      )
      .optional(),
    alias: InvoicePointerSchema.nullish(),
    address: AddressSchema.nullish(),
    counterparty_alias: InvoicePointerSchema.nullish(),
    counterparty_address: AddressSchema.nullish(),
    chamber_of_commerce_number: z.string().nullish(),
    vat_number: z.string().nullish(),
    description: z.string().nullish(),
    due_date: z.string().nullish(),
    pdf_attachment: z
      .object({
        uuid: z.string().optional(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

export const InvoiceResponseSchema = z
  .object({
    Invoice: InvoiceSchema,
  })
  .passthrough();

// ============== Auth Response Schemas ==============

export const InstallationResponseSchema = z
  .object({
    Token: z.object({ token: z.string() }).passthrough().optional(),
    ServerPublicKey: z.object({ server_public_key: z.string() }).passthrough().optional(),
  })
  .passthrough();

export const DeviceServerResponseSchema = z
  .object({
    Id: z.object({ id: z.number() }).passthrough(),
  })
  .passthrough();

export const SessionServerResponseSchema = z
  .object({
    Token: z.object({ token: z.string() }).passthrough().optional(),
    UserPerson: z.object({ id: z.number() }).passthrough().optional(),
    UserCompany: z.object({ id: z.number() }).passthrough().optional(),
    UserApiKey: z.object({ id: z.number() }).passthrough().optional(),
  })
  .passthrough();

// ============== Direct Debit Whitelist Schemas ==============

export const WhitelistSddSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    monetary_account_paying_id: z.number().optional(),
    status: z.string().optional(),
    credit_scheme_identifier: z.string().optional(),
    counterparty_alias: PaymentAliasSchema.optional(),
    mandate_identifier: z.string().optional(),
    maximum_amount_per_payment: AmountSchema.optional(),
    maximum_amount_per_month: AmountSchema.optional(),
    user_alias_created: PaymentAliasSchema.optional(),
  })
  .passthrough();

export const WhitelistSddOneOffSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    monetary_account_paying_id: z.number().optional(),
    request_id: z.number().optional(),
    status: z.string().optional(),
    credit_scheme_identifier: z.string().optional(),
    counterparty_alias: PaymentAliasSchema.optional(),
    mandate_identifier: z.string().optional(),
    maximum_amount_per_payment: AmountSchema.optional(),
    user_alias_created: PaymentAliasSchema.optional(),
  })
  .passthrough();

export const WhitelistSddRecurringSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    monetary_account_paying_id: z.number().optional(),
    status: z.string().optional(),
    credit_scheme_identifier: z.string().optional(),
    counterparty_alias: PaymentAliasSchema.optional(),
    mandate_identifier: z.string().optional(),
    maximum_amount_per_payment: AmountSchema.optional(),
    maximum_amount_per_month: AmountSchema.optional(),
    user_alias_created: PaymentAliasSchema.optional(),
  })
  .passthrough();

export const WhitelistSddResponseSchema = z
  .object({
    WhitelistSdd: WhitelistSddSchema.optional(),
    WhitelistSddOneOff: WhitelistSddOneOffSchema.optional(),
    WhitelistSddRecurring: WhitelistSddRecurringSchema.optional(),
  })
  .passthrough();

// ============== Tree Progress Schema ==============

export const TreeProgressSchema = z
  .object({
    id: z.number().optional(),
    number_of_tree: z.number().optional(),
    progress_tree_next: z.union([z.number(), z.string()]).optional(),
    url_plant_a_tree: z.string().optional(),
  })
  .passthrough();

export const TreeProgressResponseSchema = z
  .object({
    TreeProgress: TreeProgressSchema.optional(),
    TreeProgressUser: TreeProgressSchema.optional(),
    TreeProgressCard: TreeProgressSchema.optional(),
    TreeProgressPotential: TreeProgressSchema.optional(),
    TreeProgressReferral: TreeProgressSchema.optional(),
    TreeProgressReward: TreeProgressSchema.optional(),
  })
  .passthrough();

// ============== Billing Contract Subscription Schemas ==============

export const BillingContractSubscriptionSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    contract_date_start: z.string().optional(),
    contract_date_end: z.string().nullish(),
    contract_version: z.number().optional(),
    subscription_type: z.string().optional(),
    subscription_type_downgrade: z.string().nullish(),
    status: z.string().optional(),
    sub_status: z.string().optional(),
  })
  .passthrough();

export const BillingContractSubscriptionResponseSchema = z
  .object({
    BillingContractSubscription: BillingContractSubscriptionSchema,
  })
  .passthrough();

// ============== Device Schemas ==============

export const DeviceServerSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    description: z.string().optional(),
    ip: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const DeviceResponseSchema = z
  .object({
    DeviceServer: DeviceServerSchema.optional(),
  })
  .passthrough();

// ============== Transaction Category Schemas ==============

export const TransactionCategorySchema = z
  .object({
    id: z.number(),
    category: z.string(),
    category_description: z.string().optional(),
    category_old: z.string().optional(),
  })
  .passthrough();

export const TransactionCategoryResponseSchema = z
  .object({
    AdditionalTransactionInformationCategory: TransactionCategorySchema,
  })
  .passthrough();

// ============== Annual Overview Schemas ==============

export const AnnualOverviewSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    year: z.number(),
    alias_user_id: z.number().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const AnnualOverviewResponseSchema = z
  .object({
    ExportAnnualOverview: AnnualOverviewSchema,
  })
  .passthrough();

// ============== IP Whitelist Schemas ==============

export const CredentialPasswordIpSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    ip: z.string(),
    status: z.string().optional(),
  })
  .passthrough();

export const CredentialPasswordIpResponseSchema = z
  .object({
    CredentialPasswordIp: CredentialPasswordIpSchema,
  })
  .passthrough();

// ============== Switch Service Schemas ==============

export const SwitchServicePaymentSchema = z
  .object({
    id: z.number(),
    created: z.string().optional(),
    updated: z.string().optional(),
    status: z.string().optional(),
    time_start_desired: z.string().optional(),
    bank_bic: z.string().optional(),
    bank_iban: z.string().optional(),
    user_alias: z.unknown().optional(),
  })
  .passthrough();

export const SwitchServicePaymentResponseSchema = z
  .object({
    SwitchServicePayment: SwitchServicePaymentSchema,
  })
  .passthrough();

// ============== Type Exports ==============

export type Event = z.infer<typeof EventSchema>;
export type ShareInviteMonetaryAccount = z.infer<typeof ShareInviteMonetaryAccountInquirySchema>;
export type NotificationFilterUrl = z.infer<typeof NotificationFilterUrlSchema>;
export type NotificationFilterPush = z.infer<typeof NotificationFilterPushSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type WhitelistSdd = z.infer<typeof WhitelistSddSchema>;
export type WhitelistSddOneOff = z.infer<typeof WhitelistSddOneOffSchema>;
export type WhitelistSddRecurring = z.infer<typeof WhitelistSddRecurringSchema>;
export type TreeProgress = z.infer<typeof TreeProgressSchema>;
export type BillingContractSubscription = z.infer<typeof BillingContractSubscriptionSchema>;
export type DeviceServer = z.infer<typeof DeviceServerSchema>;
export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;
export type AnnualOverview = z.infer<typeof AnnualOverviewSchema>;
export type CredentialPasswordIp = z.infer<typeof CredentialPasswordIpSchema>;
export type SwitchServicePayment = z.infer<typeof SwitchServicePaymentSchema>;
