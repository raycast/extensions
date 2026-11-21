import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ErrorScreen } from "./components/error-view";
import { showErrorToast } from "./lib/error-toast";
import { followMarkdown, profileLink } from "./lib/format";
import { checkFollow } from "./lib/users";

export default function Command({ arguments: { source, target } }: LaunchProps<{ arguments: Arguments.CheckFollow }>) {
  const { data, error, isLoading, revalidate } = useCachedPromise(checkFollow, [source, target], {
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  if (error && !data && !isLoading) return <ErrorScreen error={error} onRetry={revalidate} />;
  return (
    <Detail
      isLoading={isLoading}
      markdown={data && followMarkdown(data)}
      actions={
        data && (
          <ActionPanel>
            <Action.OpenInBrowser title="Open Source Profile" url={profileLink(data.sourceUsername)} />
            <Action.OpenInBrowser title="Open Target Profile" url={profileLink(data.targetUsername)} />
          </ActionPanel>
        )
      }
    />
  );
}
