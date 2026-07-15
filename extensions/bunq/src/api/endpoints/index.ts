/**
 * Barrel export for all API endpoints.
 *
 * This module re-exports all endpoint functions and types from domain-specific modules,
 * maintaining backwards compatibility with existing imports from './endpoints'.
 */

// ============== Users ==============
export {
  getUsers,
  getUserProfile,
  getAvatarUuid,
  updateUserAvatar,
  type BunqUser,
  type UserPerson,
  type UserCompany,
} from "./users";

// ============== Accounts ==============
export {
  getMonetaryAccounts,
  getMonetaryAccount,
  getInsights,
  createCustomerStatement,
  getCustomerStatements,
  type MonetaryAccount,
  type MonetaryAccountType,
  type InsightCategory,
  type CustomerStatement,
  type CustomerStatementCreate,
} from "./accounts";

// ============== Payments ==============
export {
  // Payments
  getPayments,
  getAllPayments,
  getPayment,
  createPayment,
  getPaymentCounterpartyName,
  isIncomingPayment,
  // Payment batches
  createPaymentBatch,
  getPaymentBatches,
  // Draft payments
  createDraftPayment,
  getDraftPayments,
  getDraftPayment,
  updateDraftPayment,
  // Scheduled payments
  getScheduledPayments,
  createScheduledPayment,
  cancelScheduledPayment,
  // Payment notes
  addPaymentNote,
  getPaymentNotes,
  deletePaymentNote,
  getPaymentAttachments,
  // Attachments
  uploadAttachment,
  // Types
  type Payment,
  type DraftPayment,
  type DraftPaymentEntry,
  type PaymentBatch,
  type ScheduledPayment,
  type NoteText,
  type NoteAttachment,
  type Pagination,
  type PaginationOptions,
  type PaginatedResult,
  type PaymentRequest,
  type PaymentBatchRequest,
  type DraftPaymentRequest,
  type ScheduledPaymentCreate,
  type Amount,
  type Pointer,
} from "./payments";

// ============== Cards ==============
export {
  getCards,
  updateCard,
  generateCardCvc2,
  getCardCvc2,
  getMastercardActions,
  getMastercardActionsForCard,
  getMastercardAction,
  type Card,
  type CardCategory,
  type CardUpdateRequest,
  type GeneratedCvc2,
  type MastercardAction,
} from "./cards";

// ============== Requests ==============
export {
  // Request inquiries
  getRequestInquiries,
  createRequestInquiry,
  revokeRequestInquiry,
  // Request inquiry batches
  createRequestInquiryBatch,
  getRequestInquiryBatches,
  // Request responses (incoming)
  getRequestResponses,
  respondToRequest,
  // BunqMe tabs
  getBunqMeTabs,
  createBunqMeTab,
  closeBunqMeTab,
  // Types
  type RequestInquiry,
  type RequestInquiryBatch,
  type RequestResponse,
  type BunqMeTab,
  type RequestInquiryCreate,
  type BunqMeTabCreate,
} from "./requests";

// ============== Transfers (TransferWise) ==============
export {
  getTransferWiseCurrencies,
  createTransferWiseQuote,
  getTransferWiseQuote,
  getTransferWiseQuotes,
  getTransferWiseTransfers,
  createTransferWiseTransfer,
  getTransferWiseTransfer,
  type TransferWiseCurrency,
  type TransferWiseQuote,
  type TransferWiseTransfer,
  type TransferWiseQuoteRequest,
  type TransferWiseTransferCreate,
} from "./transfers";

// ============== Allocations ==============
export {
  getAutoAllocations,
  createAutoAllocation,
  deleteAutoAllocation,
  type AutoAllocationRule,
  type AutoAllocationRequest,
} from "./allocations";

// ============== Shares ==============
export {
  getShareInvites,
  createShareInvite,
  updateShareInvite,
  getShareInviteResponses,
  respondToShareInvite,
  revokeShareInvite,
  type ShareInviteMonetaryAccount,
  type ShareAccessLevel,
  type ShareDetailPayment,
  type ShareDetailReadOnly,
  type ShareDetailDraftPayment,
  type ShareInviteCreate,
} from "./shares";

// ============== Misc ==============
export {
  // Events
  getEvents,
  getEvent,
  // Notification filters (push)
  getNotificationFiltersPush,
  setNotificationFiltersPush,
  deleteNotificationFilterPush,
  // Notification filters (URL/webhooks)
  getNotificationFilters,
  createNotificationFilter,
  deleteNotificationFilter,
  // Devices
  getDevices,
  deleteDevice,
  // Direct debit whitelists
  getWhitelistSdd,
  deleteWhitelistSdd,
  // Tree progress
  getTreeProgress,
  // Billing subscriptions
  getBillingContractSubscription,
  // Invoices
  getInvoices,
  getInvoice,
  getInvoicePdf,
  // Transaction categories
  getTransactionCategory,
  updateTransactionCategory,
  // Annual overviews
  createAnnualOverview,
  getAnnualOverviews,
  // IP whitelist
  getIpWhitelist,
  addIpToWhitelist,
  removeIpFromWhitelist,
  // Switch service
  getSwitchServicePayments,
  createSwitchServicePayment,
  // Types
  type Event,
  type NotificationFilterPush,
  type NotificationFilterUrl,
  type NotificationFilterCreate,
  type Invoice,
  type DeviceServer,
  type WhitelistSdd,
  type CombinedTreeProgress,
  type TreeProgress,
  type BillingContractSubscription,
  type TransactionCategory,
  type AnnualOverview,
  type CredentialPasswordIp,
  type SwitchServicePayment,
} from "./misc";
