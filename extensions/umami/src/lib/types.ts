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
