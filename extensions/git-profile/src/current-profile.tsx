import type { GitProfile } from "@/types";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import GitProfileListItem from "@/components/GitProfileListItem";
import { getGitProfiles } from "@/utils";

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(async () => {
    const profiles = await getGitProfiles(["global", "system"]);
    const profile = { scope: "local", name: "---", email: "---" } satisfies GitProfile;
    return [...profiles, profile];
  });

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Select Git scope">
      {data?.map((profile) => <GitProfileListItem key={profile.scope} profile={profile} revalidate={revalidate} />)}
    </List>
  );
}
