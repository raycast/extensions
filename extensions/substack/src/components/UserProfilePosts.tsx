import { useEffect } from "react";

import { Detail } from "@raycast/api";

import type { Profile } from "@/types";

import { useIfUrlExists } from "@/hooks/useIfUrlExists";

import CachedProfilePosts from "./CachedProfilePosts";
import ProfilePosts from "./ProfilePosts";

export default function UserProfilePosts({ profile }: { profile: Profile }) {
  const { exists, isLoading, error } = useIfUrlExists(
    profile.handle ? `https://${profile.handle}.substack.com/api/v1/publication/client-search-cache` : null,
  );

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (exists) {
    return <CachedProfilePosts handle={profile.handle as string} />;
  }

  return <ProfilePosts userId={profile.id} />;
}
