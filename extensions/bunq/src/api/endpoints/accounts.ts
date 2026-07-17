/**
 * Monetary account-related API endpoints.
 */

import { get, post } from "../client";
import type { RequestOptions } from "../client";
import {
  MonetaryAccountResponseSchema,
  MonetaryAccountSchema,
  InsightsResponseSchema,
  CustomerStatementResponseSchema,
  safeParse,
  type MonetaryAccount as BaseMonetaryAccount,
  type InsightCategory,
  type CustomerStatement,
} from "../schemas";
import { parseResponseItems, parseIdResponseOrThrow } from "../response-parser";
import { logger } from "../../lib/logger";

// ============== Account Types ==============

export type MonetaryAccountType =
  | "MonetaryAccountBank"
  | "MonetaryAccountJoint"
  | "MonetaryAccountSavings"
  | "MonetaryAccountExternal"
  | "MonetaryAccountCard";

export interface MonetaryAccount extends BaseMonetaryAccount {
  accountType: MonetaryAccountType;
}

// ============== Account Endpoints ==============

const ACCOUNT_TYPES: MonetaryAccountType[] = [
  "MonetaryAccountBank",
  "MonetaryAccountJoint",
  "MonetaryAccountSavings",
  "MonetaryAccountExternal",
  "MonetaryAccountCard",
];

/**
 * Fetches all monetary accounts for a user.
 */
export async function getMonetaryAccounts(userId: string, options: RequestOptions): Promise<MonetaryAccount[]> {
  logger.debug("Fetching monetary accounts", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/monetary-account`, options);

  logger.debug("Raw monetary account response", { itemCount: response.Response.length });

  const accounts: MonetaryAccount[] = [];

  for (const item of response.Response) {
    const itemObj = item as Record<string, unknown>;

    for (const accountType of ACCOUNT_TYPES) {
      if (accountType in itemObj) {
        const accountData = itemObj[accountType];
        const parsed = safeParse(MonetaryAccountSchema, accountData, `monetary account (${accountType})`);
        if (parsed) {
          accounts.push({ ...parsed, accountType });
        }
        break;
      }
    }
  }

  logger.debug("Fetched monetary accounts", { count: accounts.length });
  return accounts;
}

/**
 * Fetches a single monetary account by ID.
 */
export async function getMonetaryAccount(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<MonetaryAccount | null> {
  logger.debug("Fetching monetary account", { userId, accountId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/monetary-account/${accountId}`, options);

  for (const item of response.Response) {
    const parsed = safeParse(MonetaryAccountResponseSchema, item, "monetary account response");
    if (parsed) {
      for (const accountType of ACCOUNT_TYPES) {
        if (parsed[accountType]) {
          return { ...parsed[accountType]!, accountType };
        }
      }
    }
  }

  return null;
}

// ============== Insights ==============

/**
 * Fetches spending insights for an account.
 */
export async function getInsights(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<InsightCategory[]> {
  logger.debug("Fetching insights", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/insight-preference-date`,
    options,
  );

  const insights = parseResponseItems(response, InsightsResponseSchema, "InsightCategory", "insights response");

  logger.debug("Fetched insights", { count: insights.length });
  return insights;
}

// ============== Customer Statements ==============

/**
 * Customer statement creation parameters.
 */
export interface CustomerStatementCreate {
  statement_format: "PDF" | "CSV" | "MT940";
  date_start: string;
  date_end: string;
  regional_format: "UK_US" | "EUROPEAN";
}

/**
 * Requests generation of an account statement.
 */
export async function createCustomerStatement(
  userId: string,
  accountId: number,
  statement: CustomerStatementCreate,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating customer statement", {
    userId,
    accountId,
    format: statement.statement_format,
    dateRange: `${statement.date_start} to ${statement.date_end}`,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/customer-statement`,
    statement,
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "customer statement");
  logger.info("Customer statement created", { statementId: id });
  return id;
}

/**
 * Fetches customer statements for an account.
 */
export async function getCustomerStatements(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<CustomerStatement[]> {
  logger.debug("Fetching customer statements", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/customer-statement`,
    options,
  );

  return parseResponseItems(
    response,
    CustomerStatementResponseSchema,
    "CustomerStatement",
    "customer statement response",
  );
}

// Re-export types
export type { InsightCategory, CustomerStatement };
