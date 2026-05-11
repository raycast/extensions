/**
 * Account sharing API endpoints.
 * Handles share invites for monetary accounts.
 */

import { get, post, put } from "../client";
import type { RequestOptions } from "../client";
import { ShareInviteMonetaryAccountResponseSchema, type ShareInviteMonetaryAccount } from "../schemas";
import { parseResponseItems, parseIdResponseOrThrow } from "../response-parser";
import { logger } from "../../lib/logger";

// ============== Types ==============

/**
 * Share access levels for monetary accounts.
 */
export type ShareAccessLevel =
  | "VIEW_BALANCE"
  | "VIEW_TRANSACTION"
  | "DRAFT_PAYMENT"
  | "FULL_TRANSIENT"
  | "FULL_PERMANENT";

/**
 * Share detail types for different access levels.
 */
export interface ShareDetailPayment {
  make_payments?: boolean;
  make_draft_payments?: boolean;
  view_balance?: boolean;
  view_old_events?: boolean;
  view_new_events?: boolean;
}

export interface ShareDetailReadOnly {
  view_balance?: boolean;
  view_old_events?: boolean;
  view_new_events?: boolean;
}

export interface ShareDetailDraftPayment {
  make_draft_payments?: boolean;
  view_balance?: boolean;
  view_old_events?: boolean;
  view_new_events?: boolean;
}

/**
 * Share invite creation parameters.
 */
export interface ShareInviteCreate {
  counter_user_alias: { type: string; value: string };
  share_detail: {
    payment?: ShareDetailPayment;
    read_only?: ShareDetailReadOnly;
    draft_payment?: ShareDetailDraftPayment;
  };
  access_type?: ShareAccessLevel;
  status?: "PENDING" | "CANCELLED";
  start_date?: string;
  end_date?: string;
}

// ============== Outgoing Share Invites ==============

/**
 * Fetches share invites for a monetary account.
 */
export async function getShareInvites(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<ShareInviteMonetaryAccount[]> {
  logger.debug("Fetching share invites", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/share-invite-monetary-account-inquiry`,
    options,
  );

  const shares = parseResponseItems(
    response,
    ShareInviteMonetaryAccountResponseSchema,
    "ShareInviteMonetaryAccountInquiry",
    "share invite response",
  );

  logger.debug("Fetched share invites", { count: shares.length });
  return shares;
}

/**
 * Creates a new share invite for a monetary account.
 */
export async function createShareInvite(
  userId: string,
  accountId: number,
  invite: ShareInviteCreate,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating share invite", { userId, accountId });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/share-invite-monetary-account-inquiry`,
    invite,
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "share invite");
}

/**
 * Updates a share invite (e.g., to cancel it).
 */
export async function updateShareInvite(
  userId: string,
  accountId: number,
  shareInviteId: number,
  update: { status?: "CANCELLED" | "REVOKED" },
  options: RequestOptions,
): Promise<void> {
  logger.info("Updating share invite", { userId, accountId, shareInviteId, status: update.status });

  await put(
    `/user/${userId}/monetary-account/${accountId}/share-invite-monetary-account-inquiry/${shareInviteId}`,
    update,
    { ...options, sign: true },
  );

  logger.info("Share invite updated", { shareInviteId });
}

/**
 * Revokes an outgoing share invite.
 */
export async function revokeShareInvite(
  userId: string,
  accountId: number,
  shareInviteId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Revoking share invite", { userId, accountId, shareInviteId });

  await put(
    `/user/${userId}/monetary-account/${accountId}/share-invite-monetary-account-inquiry/${shareInviteId}`,
    { status: "REVOKED" },
    { ...options, sign: true },
  );

  logger.info("Share invite revoked", { shareInviteId });
}

// ============== Incoming Share Invites ==============

/**
 * Fetches incoming share invites (shares others sent to you).
 */
export async function getShareInviteResponses(
  userId: string,
  options: RequestOptions,
): Promise<ShareInviteMonetaryAccount[]> {
  logger.debug("Fetching share invite responses", { userId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/share-invite-monetary-account-response`,
    options,
  );

  return parseResponseItems(
    response,
    ShareInviteMonetaryAccountResponseSchema,
    "ShareInviteMonetaryAccountResponse",
    "share invite response",
  );
}

/**
 * Responds to an incoming share invite (accept or reject).
 */
export async function respondToShareInvite(
  userId: string,
  shareInviteId: number,
  status: "ACCEPTED" | "REJECTED",
  options: RequestOptions,
): Promise<void> {
  logger.info("Responding to share invite", { userId, shareInviteId, status });

  await put(
    `/user/${userId}/share-invite-monetary-account-response/${shareInviteId}`,
    { status },
    { ...options, sign: true },
  );

  logger.info("Share invite response sent", { shareInviteId, status });
}

// Re-export schema type
export type { ShareInviteMonetaryAccount };
