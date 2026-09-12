import { Image } from "@raycast/api";
import { ObjectIcon } from ".";

export interface UpdateMemberRequest {
  status?: UpdateMemberStatus;
  role?: UpdateMemberRole;
}

export interface RawMember {
  object: string;
  id: string;
  name: string;
  icon: ObjectIcon | null;
  identity: string;
  global_name: string;
  status: MemberStatus;
  role: MemberRole;
}

export interface Member extends Omit<RawMember, "icon"> {
  icon: Image.ImageLike;
}

export enum MemberStatus {
  Active = "active",
  Joining = "joining",
  Removed = "removed",
  Declined = "declined",
}

export type UpdateMemberStatus = Extract<
  MemberStatus,
  MemberStatus.Active | MemberStatus.Removed | MemberStatus.Declined
>;

export enum MemberRole {
  Viewer = "viewer",
  Editor = "editor",
  Owner = "owner",
  NoPermissions = "no_permissions",
}

export type UpdateMemberRole = Extract<MemberRole, MemberRole.Viewer | MemberRole.Editor>;
