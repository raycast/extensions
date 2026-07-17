import { showToast, Toast, ActionPanel, Detail, Action, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { isObjectEmpty } from "../lib/utils";
import LogsViewer from "./LogsViewer";
import { SubmissionDetailsResponse, SubmissionDetails } from "../lib/types/submission-details.types";
import BuildDetails from "./BuildDetails";
import generateSubmissionMarkdown from "../lib/markdown/generateSubmissionMarkdown";
import useAuth from "../hooks/useAuth";

export default function Submission({ submissionId }: { submissionId: string }) {
  const { authHeaders } = useAuth();

  const BuildDetailsPayload = JSON.stringify([
    {
      operationName: "SubmissionByIdQuery",
      variables: {
        id: submissionId,
      },
      query:
        "query SubmissionByIdQuery($id: ID!) {\n  submissions {\n    byId(submissionId: $id) {\n      ...SubmissionFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment SubmissionFragment on Submission {\n  id\n  status\n  createdAt\n  updatedAt\n  platform\n  priority\n  app {\n    id\n    name\n    icon {\n      url\n      __typename\n    }\n    fullName\n    __typename\n  }\n  initiatingActor {\n    __typename\n    firstName\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n  }\n  logFiles\n  error {\n    errorCode\n    message\n    __typename\n  }\n  submittedBuild {\n    ...Build\n    __typename\n  }\n  canRetry\n  childSubmission {\n    id\n    __typename\n  }\n  __typename\n}\n\nfragment Build on Build {\n  __typename\n  id\n  platform\n  status\n  app {\n    id\n    fullName\n    slug\n    name\n    iconUrl\n    githubRepository {\n      githubRepositoryUrl\n      __typename\n    }\n    ownerAccount {\n      name\n      __typename\n    }\n    __typename\n  }\n  artifacts {\n    applicationArchiveUrl\n    buildArtifactsUrl\n    xcodeBuildLogsUrl\n    __typename\n  }\n  distribution\n  logFiles\n  metrics {\n    buildWaitTime\n    buildQueueTime\n    buildDuration\n    __typename\n  }\n  initiatingActor {\n    id\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n    __typename\n  }\n  createdAt\n  enqueuedAt\n  provisioningStartedAt\n  workerStartedAt\n  completedAt\n  updatedAt\n  expirationDate\n  sdkVersion\n  runtime {\n    id\n    version\n    __typename\n  }\n  updateChannel {\n    id\n    name\n    __typename\n  }\n  buildProfile\n  appVersion\n  appBuildVersion\n  gitCommitHash\n  gitCommitMessage\n  isGitWorkingTreeDirty\n  message\n  resourceClassDisplayName\n  gitRef\n  projectRootDirectory\n  githubRepositoryOwnerAndName\n  projectMetadataFileUrl\n  childBuild {\n    id\n    buildMode\n    __typename\n  }\n  priority\n  queuePosition\n  initialQueuePosition\n  estimatedWaitTimeLeftSeconds\n  submissions {\n    id\n    status\n    canRetry\n    __typename\n  }\n  canRetry\n  retryDisabledReason\n  maxRetryTimeMinutes\n  buildMode\n  customWorkflowName\n  isWaived\n  developmentClient\n  selectedImage\n  customNodeVersion\n  isForIosSimulator\n  resolvedEnvironment\n}",
    },
  ]);

  const { isLoading, data: submission } = useFetch(BASE_URL, {
    body: BuildDetailsPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as SubmissionDetailsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Submission", message: errorMessages, style: Toast.Style.Failure });
        return null;
      }

      return data[0].data.submissions.byId;
    },
    onError: (error) => {
      showToast({
        title: "Error fetching submission",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: null,
  });

  function getExpoLink(submission: SubmissionDetails) {
    if (!submission || !submission.__typename) {
      return "https://expo.dev";
    }
    const link = `https://expo.dev/accounts/${submission.app.ownerAccount?.name}/projects/${submission.app.name}/${submission.__typename}s/${submission.id}`;
    return link.toLowerCase();
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Submission Details"
      markdown={submission ? generateSubmissionMarkdown(submission) : ""}
      metadata={
        <Detail.Metadata>
          {submission && (
            <>
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={submission.status}
                  color={submission?.status === "ERRORED" ? Color.Red : Color.Green}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Profile" text={submission.submittedBuild.buildProfile} />
              <Detail.Metadata.Label title="Deployement" text={submission.submittedBuild.appBuildVersion} />
              <Detail.Metadata.Label title="Version" text={submission.submittedBuild.runtime?.version} />
              <Detail.Metadata.Label title="Build Number" text={submission.submittedBuild.appBuildVersion} />
              <Detail.Metadata.Label title="Commit" text={submission.submittedBuild.gitCommitHash} />
              <Detail.Metadata.Label title="Created By" text={submission.submittedBuild.initiatingActor?.fullName} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {submission && (
            <>
              <Action.Push
                title="View Logs"
                icon={Icon.AppWindowList}
                target={<LogsViewer logFiles={submission.logFiles} />}
              />
              <Action.Push
                title="View Build"
                icon={Icon.Hammer}
                target={<BuildDetails buildId={submission.submittedBuild.id} />}
              />
              <Action.OpenInBrowser title="View on Expo" url={getExpoLink(submission)} icon={"expo.png"} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
