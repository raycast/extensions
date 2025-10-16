import { ACL } from ".";

export type User = {
  id: string;
  name: string;
  email: string;
  api_enabled: boolean;
  acls: ACL[];
};

export type AddUser = {
  name: string;
  email: string;
  password: string;
  api_enabled: boolean;
  acls: string[];
};
export type UpdateUser = AddUser;
