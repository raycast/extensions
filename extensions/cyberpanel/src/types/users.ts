export type User = {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  acl: string;
  websitesLimit: number;
};
export type ListUsersResponse = {
  status: 1;
  error_message: "None";
  data: User[] | string;
};

export type CreateUserResponse = {
  status: 1;
  createStatus: 1;
  error_message: "None";
};
export type CreateUserFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
  websitesLimit: string;
  selectedACL: string;
};
export type CreateUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
  websitesLimit: number;
  selectedACL: string;
};

export type ModifyUserFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  securityLevel: string;
  twofa: boolean;
  passwordByPass: string;
};
export type ModifyUserRequest = {
  accountUsername: string;
  firstName: string;
  lastName: string;
  email: string;
  securityLevel: string;
  twofa: number;
  passwordByPass: string;
};
export type ModifyUserResponse = {
  status: 1;
  saveStatus: 1;
  error_message: "None";
};

export type ChangeUserACLFormValues = {
  selectedACL: string;
};
export type ChangeUserACLRequest = {
  selectedUser: string;
  selectedACL: string;
};
export type ChangeUserACLResponse = {
  status: 1;
};

export type DeleteUserRequest = {
  accountUsername: string;
};
export type DeleteUserResponse = {
  status: 1;
  deleteStatus: 1;
  error_message: "None";
};

export type UserRequestBody = CreateUserRequest | ModifyUserRequest | ChangeUserACLRequest | DeleteUserRequest;
export type UserSuccessResponse =
  | ListUsersResponse
  | CreateUserResponse
  | ModifyUserResponse
  | ChangeUserACLResponse
  | DeleteUserResponse;
