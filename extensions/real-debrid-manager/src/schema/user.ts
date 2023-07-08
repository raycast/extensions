export type UserData = {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: "premium" | "free";
  premium: number;
  expiration: string;
};
