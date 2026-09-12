/**
 * User-related API endpoints.
 */

import { get } from "../client";
import type { RequestOptions } from "../client";
import { UserPersonSchema, UserCompanySchema, safeParse, type UserPerson, type UserCompany } from "../schemas";
import { logger } from "../../lib/logger";

// ============== User Types ==============

/**
 * Represents a bunq user (person, company, or API key).
 */
export interface BunqUser {
  id: number;
  type: "UserPerson" | "UserCompany" | "UserApiKey" | "UserLight";
  displayName: string;
  publicNickName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: { uuid: string };
}

// ============== User Endpoints ==============

/**
 * Fetches all users the API key has access to.
 */
export async function getUsers(options: RequestOptions): Promise<BunqUser[]> {
  logger.debug("Fetching all users");

  const response = await get<Record<string, unknown>>("/user", options);

  if (!Array.isArray(response.Response)) {
    logger.warn("Invalid response structure for users");
    return [];
  }

  logger.debug("Raw user response", { response: JSON.stringify(response.Response).substring(0, 500) });

  const users: BunqUser[] = [];

  for (const item of response.Response) {
    const itemObj = item as Record<string, unknown>;
    for (const key of Object.keys(itemObj)) {
      const value = itemObj[key] as Record<string, unknown>;
      if (value && typeof value === "object" && "id" in value) {
        logger.debug("Found user", {
          type: key,
          id: value["id"],
          displayName: value["display_name"],
          publicNickName: value["public_nick_name"],
        });
        const user: BunqUser = {
          id: value["id"] as number,
          type: key as BunqUser["type"],
          displayName: (value["display_name"] as string) || "",
        };
        if (value["public_nick_name"] !== undefined) {
          user.publicNickName = value["public_nick_name"] as string;
        }
        if (value["first_name"] !== undefined) {
          user.firstName = value["first_name"] as string;
        }
        if (value["last_name"] !== undefined) {
          user.lastName = value["last_name"] as string;
        }
        if (value["avatar"] !== undefined) {
          user.avatar = value["avatar"] as { uuid: string };
        }
        users.push(user);
      }
    }
  }

  logger.debug("Fetched users", { count: users.length });
  return users;
}

/**
 * Fetches detailed user profile information.
 */
export async function getUserProfile(
  userId: string,
  options: RequestOptions,
): Promise<UserPerson | UserCompany | null> {
  logger.debug("Fetching user profile", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}`, options);

  for (const item of response.Response) {
    const itemObj = item as Record<string, unknown>;
    if ("UserPerson" in itemObj) {
      return safeParse(UserPersonSchema, itemObj["UserPerson"], "user person") ?? null;
    }
    if ("UserCompany" in itemObj) {
      return safeParse(UserCompanySchema, itemObj["UserCompany"], "user company") ?? null;
    }
  }

  return null;
}

/**
 * Gets the avatar UUID for a user.
 */
export async function getAvatarUuid(userId: string, options: RequestOptions): Promise<string | null> {
  logger.debug("Getting avatar UUID", { userId });

  const profile = await getUserProfile(userId, options);
  return profile?.avatar?.uuid || null;
}

/**
 * Updates the user's avatar UUID.
 */
export async function updateUserAvatar(userId: string, avatarUuid: string, options: RequestOptions): Promise<void> {
  logger.info("Updating user avatar", { userId, avatarUuid });

  const { put } = await import("../client");
  await put(`/user/${userId}`, { avatar_uuid: avatarUuid }, { ...options, sign: true });

  logger.info("User avatar updated", { userId });
}

// Re-export types
export type { UserPerson, UserCompany };
