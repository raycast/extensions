// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
import { z } from "zod";
import { Email, IsoDate, Pagination, Uuid } from "./common.js";
import { UserRole, UserStatus } from "./auth.js";
import { PlanId, PlanSource } from "./billing.js";

export const AdminStats = z.object({
  users: z.number().int(),
  activeUsers: z.number().int(),
  blockedUsers: z.number().int(),
  organizations: z.number().int(),
  vaults: z.number().int(),
  items: z.number().int(),
  activeSessions: z.number().int(),
  premiumUsers: z.number().int(),
  loginsLast24h: z.number().int(),
  failedLoginsLast24h: z.number().int(),
});

export const AdminUser = z.object({
  id: Uuid,
  email: Email,
  name: z.string(),
  role: UserRole,
  status: UserStatus,
  createdAt: IsoDate,
  updatedAt: IsoDate,
  lastLoginAt: IsoDate.nullable(),
  sessionCount: z.number().int(),
  vaultCount: z.number().int(),
  plan: PlanId,
  planSource: PlanSource,
});
export const AdminUsersQuery = Pagination.extend({
  query: z.string().trim().max(200).optional(),
  status: UserStatus.optional(),
  role: UserRole.optional(),
});
export const AdminUpdateUserRequest = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: UserRole.optional(),
    status: UserStatus.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nessun campo da aggiornare");

export const AdminInviteUserRequest = z.object({ email: Email });
export const AdminInviteUserResponse = z.object({ email: Email, token: z.string(), expiresAt: IsoDate });

export const AdminOrganization = z.object({
  id: Uuid,
  name: z.string(),
  memberCount: z.number().int(),
  vaultCount: z.number().int(),
  createdAt: IsoDate,
});
export const AdminOrganizationDetail = AdminOrganization.extend({
  members: z.array(
    z.object({ userId: Uuid, email: Email, name: z.string(), role: z.string(), createdAt: IsoDate }),
  ),
  vaults: z.array(
    z.object({ id: Uuid, name: z.string(), itemCount: z.number().int(), memberCount: z.number().int() }),
  ),
});

export const AdminVault = z.object({
  id: Uuid,
  name: z.string(),
  organizationId: Uuid.nullable(),
  organizationName: z.string().nullable(),
  itemCount: z.number().int(),
  memberCount: z.number().int(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export const AdminVaultsQuery = Pagination.extend({ organizationId: Uuid.optional(), query: z.string().max(200).optional() });

export const AuditAction = z.enum([
  "auth.register",
  "auth.login",
  "auth.login_failed",
  "auth.logout",
  "auth.refresh_reuse_detected",
  "auth.password_changed",
  "session.revoked",
  "vault.created",
  "vault.updated",
  "vault.deleted",
  "vault.member_added",
  "vault.member_updated",
  "vault.member_removed",
  "vault.rotated",
  "item.created",
  "item.updated",
  "item.deleted",
  "item.restored",
  "item.imported",
  "org.created",
  "org.updated",
  "org.invite_created",
  "org.invite_accepted",
  "org.member_removed",
  "org.member_updated",
  "admin.user_updated",
  "admin.user_sessions_revoked",
  "admin.user_invited",
  "admin.setting_updated",
  "admin.premium_granted",
  "billing.checkout_started",
  "billing.subscription_updated",
  "billing.store_purchase_verified",
  "billing.store_subscription_updated",
]);
export type AuditAction = z.infer<typeof AuditAction>;

export const AuditEntry = z.object({
  id: Uuid,
  actorId: Uuid.nullable(),
  actorEmail: Email.nullable(),
  action: AuditAction,
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  ip: z.string().nullable(),
  createdAt: IsoDate,
});
export const AuditQuery = Pagination.extend({
  actorId: Uuid.optional(),
  action: AuditAction.optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
});

export const SettingKey = z.enum([
  "smtp.host",
  "smtp.port",
  "smtp.user",
  "smtp.password",
  "smtp.from",
  "app.name",
  "app.url",
  "stripe.secret_key",
  "stripe.webhook_secret",
  "stripe.price_id",
  "appstore.issuer_id",
  "appstore.key_id",
  "appstore.private_key",
  "appstore.bundle_id",
  "appstore.product_id",
  "appstore.mac_bundle_id",
  "appstore.mac_product_id",
  "playstore.package_name",
  "playstore.service_account_json",
  "playstore.product_id",
  "playstore.rtdn_token",
]);
export const AdminSetting = z.object({ key: SettingKey, configured: z.boolean(), updatedAt: IsoDate.nullable() });
export const AdminUpdateSettingRequest = z.object({ key: SettingKey, value: z.string().max(10_000) });
