import { showToast, Toast, Color, List, Icon, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { changeCase, humanDateTime, isObjectEmpty } from "../lib/utils";
import BuildDetails from "./BuildDetails";
import Submission from "./SubmissionDetails";
import UpdateGroup from "./UpdateDetails";
import { ProjectTimelineResponse, ProjectActivity, Project } from "../lib/types/projects.types";
import useAuth from "../hooks/useAuth";

export default function ProjectTimeline({ project }: { project: Project }) {
  const { authHeaders } = useAuth();

  const ProjectTimelinePayload = JSON.stringify([
    {
      operationName: "AppTimelineActivityQuery",
      variables: {
        appFullName: project.fullName,
        first: 10,
        filter: {
          types: ["BUILD", "SUBMISSION", "UPDATE", "WORKFLOW_RUN", "WORKER"],
        },
      },
      query:
        "query AppTimelineActivityQuery($appFullName: String!, $first: Int!, $filter: TimelineActivityFilterInput, $after: String) {\n  app {\n    byFullName(fullName: $appFullName) {\n      id\n      timelineActivity(first: $first, filter: $filter, after: $after) {\n        edges {\n          cursor\n          node {\n            __typename\n            ...TableBuild\n            ...TableUpdate\n            ...TableSubmission\n            ...TableWorkflowRun\n            ...TableWorker\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TableBuild on Build {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  initiatingActor {\n    id\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n    __typename\n  }\n  buildChannel: updateChannel {\n    id\n    name\n    __typename\n  }\n  buildPlatform: platform\n  buildStatus: status\n  buildRuntime: runtime {\n    id\n    version\n    __typename\n  }\n  buildGitCommitHash: gitCommitHash\n  buildGitCommitMessage: gitCommitMessage\n  buildIsGitWorkingTreeDirty: isGitWorkingTreeDirty\n  message\n  expirationDate\n  distribution\n  buildMode\n  customWorkflowName\n  buildProfile\n  gitRef\n  appBuildVersion\n  appVersion\n  metrics {\n    buildDuration\n    __typename\n  }\n  developmentClient\n  isForIosSimulator\n  deployment {\n    id\n    runtime {\n      ...RuntimeBasicInfo\n      __typename\n    }\n    channel {\n      ...UpdateChannelBasicInfo\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}\n\nfragment RuntimeBasicInfo on Runtime {\n  __typename\n  id\n  version\n}\n\nfragment UpdateChannelBasicInfo on UpdateChannel {\n  __typename\n  id\n  name\n  branchMapping\n  createdAt\n  updatedAt\n  isPaused\n}\n\nfragment TableUpdate on Update {\n  ...UpdateBasicInfo\n  ...UpdateActor\n  app {\n    ...AppData\n    __typename\n  }\n  branch {\n    ...UpdateBranchBasicInfo\n    __typename\n  }\n  __typename\n}\n\nfragment UpdateBasicInfo on Update {\n  __typename\n  id\n  group\n  message\n  createdAt\n  updatedAt\n  activityTimestamp\n  isRollBackToEmbedded\n  codeSigningInfo {\n    keyid\n    __typename\n  }\n  branchId\n  updateRuntime: runtime {\n    id\n    version\n    __typename\n  }\n  updatePlatform: platform\n  updateGitCommitHash: gitCommitHash\n  updateIsGitWorkingTreeDirty: isGitWorkingTreeDirty\n  manifestFragment\n  app {\n    id\n    fullName\n    slug\n    __typename\n  }\n}\n\nfragment UpdateActor on Update {\n  __typename\n  id\n  actor {\n    __typename\n    id\n    displayName\n    ... on UserActor {\n      profilePhoto\n      fullName\n      username\n      bestContactEmail\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n}\n\nfragment UpdateBranchBasicInfo on UpdateBranch {\n  __typename\n  id\n  name\n}\n\nfragment TableSubmission on Submission {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  initiatingActor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  submittedBuild {\n    id\n    appVersion\n    __typename\n  }\n  submissionPlatform: platform\n  submissionStatus: status\n}\n\nfragment TableWorkflowRun on WorkflowRun {\n  id\n  __typename\n  status\n  name\n  activityTimestamp\n  createdAt\n  updatedAt\n  workflow {\n    name\n    fileName\n    app {\n      ...AppData\n      __typename\n    }\n    __typename\n  }\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  gitCommitHash\n  gitCommitMessage\n  requestedGitRef\n  pullRequestNumber\n}\n\nfragment TableWorker on WorkerDeployment {\n  id\n  __typename\n  devDomainName\n  deploymentIdentifier\n  activityTimestamp\n  createdAt\n  url\n  deploymentDomain\n  subdomain\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectTimelinePayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectTimelineResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Activity", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.app.byFullName?.timelineActivity.edges || [];
    },
    onError: (error) => {
      showToast({
        title: "Error fetching projects",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  function setTintColor(activity: ProjectActivity) {
    if (activity.__typename === "Build") {
      if (activity.buildStatus === "FINISHED") {
        return Color.Green;
      }
      if (activity.buildStatus === "FAILED" || activity.buildStatus === "ERRORED") {
        return Color.Red;
      }
      return Color.Blue;
    }
    if (activity.__typename === "Submission") {
      if (activity.submissionStatus === "FINISHED") {
        return Color.Green;
      }
      if (activity.submissionStatus === "ERRORED") {
        return Color.Red;
      }
      return Color.Blue;
    }
    return undefined;
  }

  function getStatusTag(activity: ProjectActivity) {
    return changeCase(activity.buildStatus || activity.submissionStatus || activity.branch?.name || "", "sentence");
  }

  function getTitle(activity: ProjectActivity) {
    const platform = changeCase(
      activity.buildPlatform || activity.submissionPlatform || activity.updatePlatform || "",
      "upper",
    );
    const activityType = activity.__typename;

    return `${platform} ${activityType}`;
  }

  function getExpoLink(activity: ProjectActivity) {
    const link = `https://expo.dev/accounts/${project.ownerAccount?.name}/projects/${project.fullName}/${activity.__typename}s/${project.id}`;
    return link.toLowerCase();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Project Activity">
      {data && data.length > 0 ? (
        <>
          {data.map((project) => (
            <List.Item
              id={project.node.id}
              key={project.node.id}
              icon={{
                source:
                  project.node.__typename === "Build"
                    ? Icon.Hammer
                    : project.node.__typename === "Update"
                      ? Icon.Layers
                      : Icon.Leaf,
                tintColor: setTintColor(project.node),
              }}
              title={getTitle(project.node)}
              subtitle={humanDateTime(new Date(project.node.activityTimestamp))}
              accessories={[
                {
                  tag: {
                    value: getStatusTag(project.node),
                    color: setTintColor(project.node),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  {project.node.__typename === "Build" && (
                    <Action.Push
                      title="View Build"
                      target={<BuildDetails buildId={project.node.id} />}
                      icon={Icon.Hammer}
                    />
                  )}
                  {project.node.__typename === "Submission" && (
                    <Action.Push
                      title="View Submission"
                      target={<Submission submissionId={project.node.id} />}
                      icon={Icon.Layers}
                    />
                  )}
                  {project.node.__typename === "Update" && (
                    <Action.Push
                      title="View Update"
                      target={
                        <UpdateGroup
                          appName={project.node.app?.name ?? ""}
                          username={project.node.actor?.username ?? ""}
                          group={project.node?.group ?? ""}
                        />
                      }
                      icon={Icon.Box}
                    />
                  )}
                  <Action.OpenInBrowser
                    title="View on Expo"
                    url={getExpoLink(project.node)}
                    icon={{
                      source: "expo.png",
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No Activity Found" />
      )}
    </List>
  );
}
