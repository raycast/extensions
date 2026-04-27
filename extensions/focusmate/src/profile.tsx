import { Detail } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getProfile } from "./api";

export default function Command() {
  const { data: profile, isLoading } = useCachedPromise(() => getProfile(), [], {
    onError: (error) => {
      showFailureToast(error);
    },
  });

  const markdown = profile
    ? `
# ${profile.name}

- **User ID:** ${profile.userId}
- **Sessions:** ${profile.totalSessionCount}
- **Timezone:** ${profile.timeZone}
- **Favorite:** ${profile.isFavorite ? "Yes" : "No"}
  `.trim()
    : "";

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
