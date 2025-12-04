export type Repository = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  userOwner?: { username: string };
  organizationOwner?: { namespace: string };
};
