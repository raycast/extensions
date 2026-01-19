export type Account = {
  id: number;
  name: string;
  legal_entity_type: "company" | "individual" | "public_body" | "restrict";
  created_at: number;
  type: string;
  is_customer: boolean;
  is_sso: boolean;
};
export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  role_type: "owner" | "admin" | "user";
};
export type InviteUser = Omit<User, "user_id" | "display_name" | "role_type"> & {
  role_type: string;
};
export type AccountInvitation = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  strict: boolean;
  status: "accepted" | "cancelled" | "pending" | "rejected";
  role_type: "owner" | "admin" | "user";
};
export type Team = {
  id: number;
  name: string;
};

export type AccountDrive = {
  id: number;
  name: string;
  size: number;
  used_size: number;
};
export type DirectoryV3 = {
  id: number;
  name: string;
  type: "dir";
  last_modified_at: number;
};
export type FileV3 = {
  id: number;
  name: string;
  type: "file";
  last_modified_at: number;
  size: number;
};
export type ActivityFileV3 = {
  id: number;
  created_at: number;
  action: string;
  user_id: number;
};
export type Comment = {
  id: number;
  body: string;
};

export type SingleResult<T> = {
  result: "success";
  data: T;
};
export type PaginatedResult<T> = {
  result: "success";
  data: T[];
  total: number;
  pages: number;
  items_per_page: number;
  page: number;
};
export type CursorResult<T> = {
  result: "success";
  data: T[];
  response_at: number;
  cursor: string;
  has_more: boolean;
};
export type ErrorResult = {
  result: "error";
  error: {
    code: string;
    description: string;
    errors?: Array<{
      code: string;
      description: string;
      context: Record<string, string | number>;
    }>;
  };
};
