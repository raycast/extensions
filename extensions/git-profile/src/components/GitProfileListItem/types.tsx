import type { GitProfile } from "@/types";

export type GitProfileListItemProps = {
  profile: GitProfile;
  revalidate?: () => Promise<GitProfile[]>;
};
