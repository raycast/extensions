import { LaunchProps, open, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";

interface Preferences {
  repoUrl: string;
  mr1SourcePattern: string;
  mr1TargetPattern: string;
  mr2SourcePattern: string;
  mr2TargetPattern: string;
}

export default async function Command(props: LaunchProps<{ arguments: { branchName: string } }>) {
  const { branchName } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();

  try {
    const { repoUrl, mr1SourcePattern, mr1TargetPattern, mr2SourcePattern, mr2TargetPattern } = preferences;

    // Helper to replace placeholders
    const format = (pattern: string) => pattern.replace(/{name}/g, branchName);

    const mr1Source = format(mr1SourcePattern);
    const mr1Target = format(mr1TargetPattern);
    const mr2Source = format(mr2SourcePattern);
    const mr2Target = format(mr2TargetPattern);

    // Construct GitLab URLs
    // https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html#new-merge-request-via-url-params
    // URL format: https://gitlab.com/.../-/merge_requests/new?merge_request[source_branch]=...&merge_request[target_branch]=...

    // Ensure repoUrl doesn't end with slash
    const cleanRepoUrl = repoUrl.replace(/\/$/, "");

    const getMrUrl = (source: string, target: string) => {
      const params = new URLSearchParams();
      params.append("merge_request[source_branch]", source);
      params.append("merge_request[target_branch]", target);
      return `${cleanRepoUrl}/-/merge_requests/new?${params.toString()}`;
    };

    const url1 = getMrUrl(mr1Source, mr1Target);
    const url2 = getMrUrl(mr2Source, mr2Target);

    await open(url1);
    await open(url2);

    await showToast({
      style: Toast.Style.Success,
      title: "Opened 2 Merge Requests",
      message: `${branchName}: ${mr1Source}->${mr1Target} & ${mr2Source}->${mr2Target}`,
    });

    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Merge Requests",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
