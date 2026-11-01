// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
import { z } from "zod";
import { Email, IsoDate, Uuid } from "./common.js";

export const OrgRole = z.enum(["owner", "admin", "member"]);
export type OrgRole = z.infer<typeof OrgRole>;

export const Organization = z.object({
  id: Uuid,
  name: z.string(),
  role: OrgRole, // ruolo dell'utente corrente
  memberCount: z.number().int(),
  createdAt: IsoDate,
});
export const CreateOrganizationRequest = z.object({ name: z.string().trim().min(1).max(120) });
export const UpdateOrganizationRequest = CreateOrganizationRequest;

export const OrganizationMember = z.object({
  userId: Uuid,
  email: Email,
  name: z.string(),
  role: OrgRole,
  publicKey: z.string(),
  createdAt: IsoDate,
});
export const UpdateOrganizationMemberRequest = z.object({ role: OrgRole });

export const CreateInviteRequest = z.object({ email: Email, role: OrgRole.default("member") });
export const Invite = z.object({
  id: Uuid,
  organizationId: Uuid,
  email: Email,
  role: OrgRole,
  invitedBy: Uuid,
  expiresAt: IsoDate,
  acceptedAt: IsoDate.nullable(),
  createdAt: IsoDate,
});
/** Restituito solo a chi crea l'invito: il token va comunicato all'invitato fuori banda (o via SMTP se configurato). */
export const InviteCreated = Invite.extend({ token: z.string() });
export const AcceptInviteParams = z.object({ token: z.string().min(16).max(128) });
