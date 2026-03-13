import type { GitProfile, Scope } from "@/types";

export type GitProfileFormProps = {
  scope: Scope;
  profile: GitProfile;
  revalidate?: () => Promise<GitProfile[]>;
};

export type FormValues = {
  name: string;
  email: string;
};
