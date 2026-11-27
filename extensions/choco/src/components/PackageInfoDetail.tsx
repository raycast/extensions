import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getPackageInfoText } from "../choco/cli";

interface PackageInfoDetailProps {
  packageId: string;
}

export function PackageInfoDetail({ packageId }: PackageInfoDetailProps) {
  const { data, isLoading, error, revalidate } = usePromise(
    getPackageInfoText,
    [packageId],
  );

  const markdown = error
    ? `# Failed to Load Info for ${packageId}\n\n\`\`\`text\n${error.message}\n\`\`\``
    : `# choco info ${packageId}\n\n\`\`\`text\n${data ?? "Loading..."}\n\`\`\``;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          {data && (
            <Action.CopyToClipboard title="Copy Output" content={data} />
          )}
          <Action.OpenInBrowser
            title="Open on Chocolatey"
            url={`https://community.chocolatey.org/packages/${encodeURIComponent(packageId)}`}
          />
        </ActionPanel>
      }
    />
  );
}
