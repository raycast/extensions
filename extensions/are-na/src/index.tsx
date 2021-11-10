import { ActionPanel, Detail, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect } from "react";
import { useProfile } from "./hooks/useProfile";
import { Me } from "./types/arena";

const genMarkdown = (user: Me) => `
# ${user.username}${user.is_premium ? " ++" : ""}
[https://are.na/${user.slug}](https://are.na/${user.slug})

[${user.follower_count} followers](https://are.na/${user.slug}/followers) / 
[${user.following_count} following](https://are.na/${user.slug}/following)
`;

export default function Command() {
  const { data: user, error } = useProfile();

  useEffect(() => {
    if (error) showToast(ToastStyle.Failure, "An Error Occured.", error.message);
  }, [error]);
  return (
    <Detail
      isLoading={!user}
      markdown={user ? genMarkdown(user) : ""}
      actions={
        user ? (
          <ActionPanel>
            <OpenInBrowserAction url={`https://are.na/${user.slug}`} title={"Open in Browser"} />
            <OpenInBrowserAction url={`https://are.na/${user.slug}/followers`} title="Go to Followers" />
            <OpenInBrowserAction url={`https://are.na/${user.slug}/following`} title="Go to Following" />
          </ActionPanel>
        ) : null
      }
    />
  );
}
