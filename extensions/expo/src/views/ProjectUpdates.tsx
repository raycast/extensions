import { showToast, Toast, List, Icon, ActionPanel, Action, ImageMask, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { humanDateTime, isObjectEmpty } from "../lib/utils";
import { ProjectUpdate, ProjectUpdatesResponse } from "../lib/types/project-updates.types";
import UpdateGroup from "./UpdateDetails";
import useAuth from "../hooks/useAuth";
import { Project } from "../lib/types/projects.types";

export default function ProjectUpdates({ project }: { project: Project }) {
  const { authHeaders } = useAuth();

  const ProjectUpdatesPayload = JSON.stringify([
    {
      operationName: "UpdatesPaginated",
      variables: {
        fullName: project.fullName,
        first: 30,
      },
      query:
        "query UpdatesPaginated($fullName: String!, $after: String, $first: Int, $before: String, $last: Int) {\n  app {\n    byFullName(fullName: $fullName) {\n      id\n      updatesPaginated(after: $after, first: $first, before: $before, last: $last) {\n        edges {\n          node {\n            ...TableUpdate\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TableUpdate on Update {\n  ...UpdateBasicInfo\n  ...UpdateActor\n  app {\n    ...AppData\n    __typename\n  }\n  branch {\n    ...UpdateBranchBasicInfo\n    __typename\n  }\n  __typename\n}\n\nfragment UpdateBasicInfo on Update {\n  __typename\n  id\n  group\n  message\n  createdAt\n  updatedAt\n  activityTimestamp\n  isRollBackToEmbedded\n  codeSigningInfo {\n    keyid\n    __typename\n  }\n  branchId\n  updateRuntime: runtime {\n    id\n    version\n    __typename\n  }\n  updatePlatform: platform\n  updateGitCommitHash: gitCommitHash\n  updateIsGitWorkingTreeDirty: isGitWorkingTreeDirty\n  manifestFragment\n  app {\n    id\n    fullName\n    slug\n    __typename\n  }\n}\n\nfragment UpdateActor on Update {\n  __typename\n  id\n  actor {\n    __typename\n    id\n    displayName\n    ... on UserActor {\n      profilePhoto\n      fullName\n      username\n      bestContactEmail\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}\n\nfragment UpdateBranchBasicInfo on UpdateBranch {\n  __typename\n  id\n  name\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectUpdatesPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectUpdatesResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Updates", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.app.byFullName?.updatesPaginated.edges || [];
    },
    onError: (error) => {
      showToast({
        title: "Error fetching project updates",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  function getExpoLink(activity: ProjectUpdate) {
    const link = `https://expo.dev/accounts/${activity.app.ownerAccount?.name}/projects/${activity.app.name}/${activity.__typename}s/${activity.id}`;
    return link.toLowerCase();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Updates">
      {data && data.length > 0 ? (
        <>
          {data.map((update) => (
            <List.Item
              id={update.node.id}
              icon={{
                source: Icon.Layers,
              }}
              title={{ value: update.node.message ?? "" }}
              subtitle={humanDateTime(new Date(update.node.activityTimestamp))}
              accessories={[
                {
                  tag: { value: `${update.node.branch.name}`, color: Color.Magenta },
                  tooltip: "Branch",
                },
                {
                  tag: { value: `v${update.node.updateRuntime.version}`, color: Color.Purple },
                  tooltip: "Runtime Version",
                },
                {
                  tag: { value: `${update.node.updateGitCommitHash.slice(0, 7)}`, color: Color.Green },
                  tooltip: "Git Ref",
                },
                {
                  tag: { value: `` },
                  tooltip: "Platform",
                  icon: `${update.node.updatePlatform}.png`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Update"
                    target={
                      <UpdateGroup
                        appName={update.node.app.name ?? ""}
                        username={update.node.actor.username}
                        group={update.node.group}
                      />
                    }
                    icon={Icon.Box}
                  />
                  <Action.OpenInBrowser
                    title="View on Expo"
                    url={getExpoLink(update.node)}
                    icon={{
                      source: "expo.png",
                      mask: ImageMask.Circle,
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.EmptyView title="No Updates Found" />
      )}
    </List>
  );
}
