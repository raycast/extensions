export type UserObject = {
  id: string;
  model: "user";
  state: "enabled" | "invited";
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  access: "member" | "guest" | "anonymous";
  pictureUrl?: string;

  // REVIEW FIELDS
  archivedAt: string | null;
  archivedBy: string | null;
  reserved: boolean;
  createdAt: string;
  updatedAt: string;
};
