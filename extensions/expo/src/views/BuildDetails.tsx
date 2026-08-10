import { showToast, Toast, ActionPanel, Detail, Action, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { isObjectEmpty } from "../lib/utils";
import { Build, BuildDetailsResponse } from "../lib/types/build-details.types";
import generateBuildMarkdown from "../lib/markdown/generateBuildMarkdown";
import LogsViewer from "./LogsViewer";
import useAuth from "../hooks/useAuth";

export default function BuildDetails({ buildId }: { buildId: string }) {
  const { authHeaders } = useAuth();

  const BuildDetailsPayload = JSON.stringify([
    {
      operationName: "BuildQuery",
      variables: {
        buildId: buildId,
      },
      query:
        "query BuildQuery($buildId: ID!) {\n  builds {\n    byId(buildId: $buildId) {\n      ...Build\n      deployment {\n        id\n        runtime {\n          ...RuntimeBasicInfo\n          __typename\n        }\n        channel {\n          ...UpdateChannelBasicInfo\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment Build on Build {\n  __typename\n  id\n  platform\n  status\n  app {\n    id\n    fullName\n    slug\n    name\n    iconUrl\n    githubRepository {\n      githubRepositoryUrl\n      __typename\n    }\n    ownerAccount {\n      name\n      __typename\n    }\n    __typename\n  }\n  artifacts {\n    applicationArchiveUrl\n    buildArtifactsUrl\n    xcodeBuildLogsUrl\n    __typename\n  }\n  distribution\n  logFiles\n  metrics {\n    buildWaitTime\n    buildQueueTime\n    buildDuration\n    __typename\n  }\n  initiatingActor {\n    id\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n    __typename\n  }\n  createdAt\n  enqueuedAt\n  provisioningStartedAt\n  workerStartedAt\n  completedAt\n  updatedAt\n  expirationDate\n  sdkVersion\n  runtime {\n    id\n    version\n    __typename\n  }\n  updateChannel {\n    id\n    name\n    __typename\n  }\n  buildProfile\n  appVersion\n  appBuildVersion\n  gitCommitHash\n  gitCommitMessage\n  isGitWorkingTreeDirty\n  message\n  resourceClassDisplayName\n  gitRef\n  projectRootDirectory\n  githubRepositoryOwnerAndName\n  projectMetadataFileUrl\n  childBuild {\n    id\n    buildMode\n    __typename\n  }\n  priority\n  queuePosition\n  initialQueuePosition\n  estimatedWaitTimeLeftSeconds\n  submissions {\n    id\n    status\n    canRetry\n    __typename\n  }\n  canRetry\n  retryDisabledReason\n  maxRetryTimeMinutes\n  buildMode\n  customWorkflowName\n  isWaived\n  developmentClient\n  selectedImage\n  customNodeVersion\n  isForIosSimulator\n  resolvedEnvironment\n}\n\nfragment RuntimeBasicInfo on Runtime {\n  __typename\n  id\n  version\n}\n\nfragment UpdateChannelBasicInfo on UpdateChannel {\n  __typename\n  id\n  name\n  branchMapping\n  createdAt\n  updatedAt\n  isPaused\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: BuildDetailsPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as BuildDetailsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Builds", message: errorMessages, style: Toast.Style.Failure });
        return null;
      }

      return data[0].data.builds.byId;
    },
    onError: (error) => {
      showToast({
        title: "Error fetching project builds",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: null,
  });

  function getExpoLink(build: Build) {
    if (!build || !build.__typename) {
      return "https://expo.dev";
    }
    const link = `https://expo.dev/accounts/${build.app.ownerAccount?.name}/projects/${build.app.name}/${build.__typename}s/${build.id}`;
    return link.toLowerCase();
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Build Details"
      markdown={data ? generateBuildMarkdown(data) : ""}
      actions={
        <ActionPanel>
          {data && (
            <Action.Push title="View Logs" icon={Icon.AppWindowList} target={<LogsViewer logFiles={data.logFiles} />} />
          )}
          {data && data?.artifacts?.applicationArchiveUrl && (
            <Action.OpenInBrowser
              title="Download Build"
              url={data.artifacts.applicationArchiveUrl}
              icon={Icon.Download}
            />
          )}
          {data && <Action.OpenInBrowser title="View on Expo" url={getExpoLink(data)} icon={"expo.png"} />}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {data && (
            <>
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={data.status}
                  color={data?.status === "ERRORED" ? Color.Red : Color.Green}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Profile" text={data.buildProfile} />
              <Detail.Metadata.Label title="Deployement" text={data.appBuildVersion} />
              <Detail.Metadata.Label title="Version" text={data.runtime?.version} />
              <Detail.Metadata.Label title="Build Number" text={data.appBuildVersion} />
              <Detail.Metadata.Label title="Commit" text={data.gitCommitHash} />
              <Detail.Metadata.Label title="Created By" text={data.initiatingActor?.fullName} />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
