/**
 * These types have been copied over from official dub SDK: https://d.to/sdk
 */

import { TagSchema } from "@/types";

export type User = {
  /**
   * The role of the authenticated user in the workspace.
   */
  id: string;
  name: string;
  image: string;
};

export type ItemSchema = {
  /**
   * The unique ID of the item.
   */
  id: string;
  /**
   * The SKU of the item.
   */
  sku: string;
  /**
   * The description of the item.
   */
  description: string;
  /**
   * The cost of the item.
   */
  cost: number;
  /**
   * The supplier of the item.
   */
  supplier: string;
  /**
   * The tags assigned to the item.
   */
  tags: Array<TagSchema> | null;
  /**
   * The user ID of the creator of the item.
   */
  userId: string;
  user: User;
  /**
   * The workspace ID of the item.
   */
  workspaceId: string;
  /**
   * The number of clicks on the item.
   */
  createdAt: string;
  /**
   * The date and time when the item was last updated.
   */
  updatedAt: string;
};
