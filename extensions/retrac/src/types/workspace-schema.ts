/**
 * These types have been copied over from official dub SDK: https://d.to/sdk
 */
import { TagSchema } from "@/types";

export type Users = {
  /**
   * The role of the authenticated user in the workspace.
   */
  role: string;
};

export type WorkspaceSchema = {
  /**
   * The unique ID of the workspace.
   */
  id: string;
  /**
   * The name of the workspace.
   */
  name: string;
  /**
   * The slug of the workspace.
   */
  slug: string;
  /**
   * The logo of the workspace.
   */
  logo?: string | null | undefined;
  /**
   * The usage of the workspace.
   */
  usage: number;
  /**
   * The usage limit of the workspace.
   */
  usageLimit: number;
  /**
   * The transfers usage of the workspace.
   */
  itemsUsage: number;
  /**
   * The items limit of the workspace.
   */
  itemsLimit: number;
  /**
   * The storage units limit of the workspace.
   */
  storagesLimit: number;
  /**
   * The tags limit of the workspace.
   */
  tagsLimit: number;
  /**
   * The users limit of the workspace.
   */
  usersLimit: number;
  /**
   * The plan of the workspace.
   */
  plan: string;
  /**
   * The Stripe ID of the workspace.
   */
  stripeId: string | null;
  /**
   * The date and time when the billing cycle starts for the workspace.
   */
  billingCycleStart: number;
  /**
   * [BETA]: The Stripe Connect ID of the workspace.
   */
  stripeConnectId: string | null;
  /**
   * The date and time when the workspace was created.
   */
  createdAt: string;
  /**
   * The role of the authenticated user in the workspace.
   */
  users: Array<Users>;
  /**
   * The invite code of the workspace.
   */
  inviteCode: string | null;
  /**
   * Tags supported by the workspace.
   */
  tags?: Array<TagSchema> | undefined;
};
