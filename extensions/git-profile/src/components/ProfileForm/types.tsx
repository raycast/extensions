import type { Profile } from "@/types";

export type ProfileFormProps = {
  id: string;
  profile?: Profile;
  revalidate?: () => Promise<Profile[]>;
};

export type FormValues = {
  name: string;
  email: string;
};
