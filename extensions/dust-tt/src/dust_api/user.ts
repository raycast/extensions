export type RoleType = "admin" | "builder" | "user" | "none";

export type WorkspaceType = {
  id: number;
  sId: string;
  name: string;
  allowedDomain: string | null;
  role: RoleType;
};

export type UserProviderType = "github" | "google";

export type UserType = {
  id: number;
  provider: UserProviderType;
  providerId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  image: string | null;
  workspaces: WorkspaceType[];
};
