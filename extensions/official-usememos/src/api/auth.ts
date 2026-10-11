import { z } from "zod";
import type { MemosConnection } from "../helpers/preferences";
import { memosFetch } from "./client";

export const currentUserSchema = z.object({
  name: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

const currentUserResponseSchema = z.object({ user: currentUserSchema });

export const getCurrentUser = async (connection: MemosConnection): Promise<CurrentUser> => {
  const { user } = await memosFetch(connection, "/api/v1/auth/me", currentUserResponseSchema);
  return user;
};
