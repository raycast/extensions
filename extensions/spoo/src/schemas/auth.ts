import { z } from "zod";

export const AuthProviderInfoSchema = z.object({
  provider: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linked_at: z.string().nullable().optional(),
});
export type AuthProviderInfo = z.infer<typeof AuthProviderInfoSchema>;

export const UserPfpSchema = z.object({
  url: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type UserPfp = z.infer<typeof UserPfpSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  email_verified: z.boolean(),
  user_name: z.string().nullable().optional(),
  plan: z.string(),
  password_set: z.boolean(),
  auth_providers: z.array(AuthProviderInfoSchema).default([]),
  pfp: UserPfpSchema.nullable().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const DeviceTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: UserProfileSchema,
});
export type DeviceTokenResponse = z.infer<typeof DeviceTokenResponseSchema>;

export const DeviceRefreshResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});
export type DeviceRefreshResponse = z.infer<typeof DeviceRefreshResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  field: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
