export interface UserObject {
  createdAt: string;
  id: string;
  model: "user";
  hue: number;
  auth: string[];
  pictureUrl: string;
  key: string;
  access: "member" | "guest" | "anonymous";
  admin: boolean;
  botType?: string;
  deleted: boolean;
  state: "enabled" | "invited";
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  signedUpAt: string;
}
