import { showToast, Toast, Color, List, Icon, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { ProjectBuildsResponse, ProjectBuild } from "../lib/types/project-builds.types";
import { changeCase, humanDateTime, isObjectEmpty } from "../lib/utils";
import BuildDetails from "./BuildDetails";
import useAuth from "../hooks/useAuth";
import { Project } from "../lib/types/projects.types";

export default function ProjectBuilds({ project }: { project: Project }) {
  const { authHeaders } = useAuth();

  const ProjectBuildsPayload = JSON.stringify([
    {
      operationName: "BuildsPaginatedQuery",
      variables: {
        fullName: project.fullName,
        first: 12,
        filter: {
          platforms: null,
        },
      },
      query:
        "query BuildsPaginatedQuery($fullName: String!, $after: String, $first: Int, $before: String, $last: Int, $filter: BuildFilterInput) {\n  app {\n    byFullName(fullName: $fullName) {\n      id\n      buildsPaginated(\n        after: $after\n        first: $first\n        before: $before\n        last: $last\n        filter: $filter\n      ) {\n        edges {\n          node {\n            ...TableBuild\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TableBuild on Build {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  actor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  initiatingActor {\n    id\n    displayName\n    ... on UserActor {\n      username\n      fullName\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n    __typename\n  }\n  buildChannel: updateChannel {\n    id\n    name\n    __typename\n  }\n  buildPlatform: platform\n  buildStatus: status\n  buildRuntime: runtime {\n    id\n    version\n    __typename\n  }\n  buildGitCommitHash: gitCommitHash\n  buildGitCommitMessage: gitCommitMessage\n  buildIsGitWorkingTreeDirty: isGitWorkingTreeDirty\n  message\n  expirationDate\n  distribution\n  buildMode\n  customWorkflowName\n  buildProfile\n  gitRef\n  appBuildVersion\n  appVersion\n  metrics {\n    buildDuration\n    __typename\n  }\n  developmentClient\n  isForIosSimulator\n  deployment {\n    id\n    runtime {\n      ...RuntimeBasicInfo\n      __typename\n    }\n    channel {\n      ...UpdateChannelBasicInfo\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}\n\nfragment RuntimeBasicInfo on Runtime {\n  __typename\n  id\n  version\n}\n\nfragment UpdateChannelBasicInfo on UpdateChannel {\n  __typename\n  id\n  name\n  branchMapping\n  createdAt\n  updatedAt\n  isPaused\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectBuildsPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectBuildsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Builds", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      const builds = data[0].data.app.byFullName?.buildsPaginated.edges.map((item) => item.node);

      return builds;
    },
    onError: (error) => {
      showToast({
        title: "Error fetching project builds",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  function setTintColor(activity: ProjectBuild) {
    if (activity.buildStatus === "FINISHED") {
      return Color.Green;
    }
    if (activity.buildStatus === "FAILED" || activity.buildStatus === "ERRORED") {
      return Color.Red;
    }
    return Color.Blue;
  }

  function getStatusTag(activity: ProjectBuild) {
    return changeCase(activity.buildStatus || "", "sentence");
  }

  function getTitle(activity: ProjectBuild) {
    const platform = changeCase(activity.buildPlatform || "", "upper");
    const activityType = activity.__typename;

    return `${platform} ${activityType}`;
  }

  function getExpoLink(activity: ProjectBuild) {
    const link = `https://expo.dev/accounts/${activity.app.ownerAccount?.name}/projects/${activity.app.name}/${activity.__typename}s/${activity.id}`;
    return link.toLowerCase();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Builds">
      {data && data.length > 0 ? (
        <>
          {data.map((build) => (
            <List.Item
              id={build.id}
              key={build.id}
              icon={{
                source: Icon.Hammer,
                tintColor: setTintColor(build),
              }}
              title={getTitle(build)}
              subtitle={humanDateTime(new Date(build.activityTimestamp))}
              accessories={[
                {
                  tag: {
                    value: getStatusTag(build),
                    color: setTintColor(build),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Build" target={<BuildDetails buildId={build.id} />} icon={Icon.Box} />
                  {build && (
                    <Action.OpenInBrowser
                      title="View on Expo"
                      url={getExpoLink(build)}
                      icon={{
                        source: "expo.png",
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No Builds Found" />
      )}
    </List>
  );
}
