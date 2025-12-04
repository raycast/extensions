export interface User {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
  nickname: string | null;
  provider: "saml" | "email" | "github";
}

export type AttributionUser = Omit<User, "provider">;
