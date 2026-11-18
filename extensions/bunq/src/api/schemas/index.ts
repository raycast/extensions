/**
 * Barrel export for all Zod schemas and types.
 *
 * This module re-exports all schemas and types from domain-specific modules,
 * maintaining backwards compatibility with existing imports from './schemas'.
 */

import { z } from "zod";
import { logger } from "../../lib/logger";

// ============== Base Schemas ==============
export {
  // Schemas
  AmountSchema,
  PointerSchema,
  PermissivePointerSchema,
  PaymentAliasSchema,
  LabelMonetaryAccountSchema,
  GeolocationSchema,
  AddressSchema,
  AvatarSchema,
  AttachmentSchema,
  AttachmentPublicSchema,
  NoteAttachmentSchema,
  NoteTextSchema,
  PaginationSchema,
  IdResponseSchema,
  UuidResponseSchema,
  // Types
  type Amount,
  type Pointer,
  type PaymentAlias,
  type Geolocation,
  type Address,
  type Avatar,
  type Attachment,
  type NoteAttachment,
  type NoteText,
  type Pagination,
} from "./base";

// ============== User Schemas ==============
export { UserPersonSchema, UserCompanySchema, type UserPerson, type UserCompany } from "./users";

// ============== Account Schemas ==============
export {
  MonetaryAccountSettingSchema,
  MonetaryAccountSchema,
  MonetaryAccountResponseSchema,
  InsightCategorySchema,
  InsightsResponseSchema,
  InsightPreferenceDateSchema,
  CustomerStatementSchema,
  CustomerStatementResponseSchema,
  type MonetaryAccount,
  type InsightCategory,
  type CustomerStatement,
} from "./accounts";

// ============== Payment Schemas ==============
export {
  PaymentSchema,
  PaymentResponseSchema,
  DraftPaymentEntrySchema,
  DraftPaymentSchema,
  DraftPaymentResponseSchema,
  PaymentBatchSchema,
  PaymentBatchResponseSchema,
  ScheduleSchema,
  ScheduledPaymentSchema,
  ScheduledPaymentResponseSchema,
  ScheduledPaymentBatchSchema,
  ScheduledPaymentBatchResponseSchema,
  type Payment,
  type DraftPayment,
  type DraftPaymentEntry,
  type PaymentBatch,
  type ScheduledPayment,
  type ScheduledPaymentBatch,
} from "./payments";

// ============== Card Schemas ==============
export {
  CardLimitSchema,
  CardCountryPermissionSchema,
  PinCodeAssignmentSchema,
  CardLabelMonetaryAccountSchema,
  CardMagStripePermissionSchema,
  CardSchema,
  CardResponseSchema,
  GeneratedCvc2Schema,
  GeneratedCvc2ResponseSchema,
  MastercardActionSchema,
  MastercardActionResponseSchema,
  type Card,
  type GeneratedCvc2,
  type MastercardAction,
} from "./cards";

// ============== Request Schemas ==============
export {
  RequestInquirySchema,
  RequestInquiryResponseSchema,
  RequestInquiryBatchSchema,
  RequestInquiryBatchResponseSchema,
  RequestResponseSchema,
  RequestResponseResponseSchema,
  BunqMeTabEntrySchema,
  BunqMeTabResultInquirySchema,
  BunqMeTabSchema,
  BunqMeTabResponseSchema,
  type RequestInquiry,
  type RequestInquiryBatch,
  type RequestResponse,
  type BunqMeTab,
} from "./requests";

// ============== Transfer Schemas ==============
export {
  TransferWiseCurrencySchema,
  TransferWiseCurrencyResponseSchema,
  TransferWiseQuoteSchema,
  TransferWiseQuoteResponseSchema,
  TransferWiseTransferSchema,
  TransferWiseTransferResponseSchema,
  type TransferWiseCurrency,
  type TransferWiseQuote,
  type TransferWiseTransfer,
} from "./transfers";

// ============== Misc Schemas ==============
export {
  EventSchema,
  EventResponseSchema,
  ShareDetailSchema,
  ShareInviteMonetaryAccountInquirySchema,
  ShareInviteMonetaryAccountResponseSchema,
  NotificationFilterUrlSchema,
  NotificationFilterUrlResponseSchema,
  NotificationFilterPushSchema,
  NotificationFilterPushResponseSchema,
  InvoiceItemSchema,
  InvoicePointerSchema,
  InvoiceSchema,
  InvoiceResponseSchema,
  InstallationResponseSchema,
  DeviceServerResponseSchema,
  SessionServerResponseSchema,
  WhitelistSddSchema,
  WhitelistSddOneOffSchema,
  WhitelistSddRecurringSchema,
  WhitelistSddResponseSchema,
  TreeProgressSchema,
  TreeProgressResponseSchema,
  BillingContractSubscriptionSchema,
  BillingContractSubscriptionResponseSchema,
  DeviceServerSchema,
  DeviceResponseSchema,
  type Event,
  type ShareInviteMonetaryAccount,
  type NotificationFilterUrl,
  type NotificationFilterPush,
  type Invoice,
  type WhitelistSdd,
  type WhitelistSddOneOff,
  type WhitelistSddRecurring,
  type TreeProgress,
  type BillingContractSubscription,
  type DeviceServer,
  TransactionCategorySchema,
  TransactionCategoryResponseSchema,
  AnnualOverviewSchema,
  AnnualOverviewResponseSchema,
  CredentialPasswordIpSchema,
  CredentialPasswordIpResponseSchema,
  SwitchServicePaymentSchema,
  SwitchServicePaymentResponseSchema,
  type TransactionCategory,
  type AnnualOverview,
  type CredentialPasswordIp,
  type SwitchServicePayment,
} from "./misc";

// ============== Validation Helpers ==============

/**
 * Safely parses data against a schema, logging warnings for validation failures.
 * Returns the parsed data if valid, or undefined if invalid.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param context - A description of what's being validated (for logging)
 * @returns The parsed data or undefined
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn(`Validation failed for ${context}`, {
      context,
      errorCount: result.error.issues.length,
      errors: result.error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
    return undefined;
  }
  return result.data;
}

/**
 * Parses data against a schema, throwing a descriptive error on failure.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param context - A description of what's being validated (for error messages)
 * @returns The parsed and validated data
 * @throws Error if validation fails
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.error(`Validation failed for ${context}`, {
      context,
      errorCount: result.error.issues.length,
      errors: result.error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
    throw new Error(`Invalid ${context}: ${result.error.issues.map((e) => e.message).join(", ")}`);
  }
  return result.data;
}
