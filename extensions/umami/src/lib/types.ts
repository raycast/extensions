export type UmamiAdminUser = {
  id: string;
  username: string;
  password: string;
  role: string;
  logoUrl: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count: {
    websiteUser: number;
  };
};

export type UmamiMe = {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  isAdmin: boolean;
};
export type UmamiUpdateMyPassword = {
  currentPassword: string;
  newPassword: string;
};

// Websites
export type AddWebsiteFormValues = {
  domain: string;
  name: string;
};

export type UmamiErrorResponse = { error: { message: string; code: string; status: number } };
