import { ActionPanel, List, Action, Image, showToast, Toast, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL } from "./lib/constants";
import { ErrorResponse } from "./lib/types";
import ProjectBuilds from "./views/ProjectBuilds";
import ProjectTimeline from "./views/ProjectTimeline";
import ProjectSubmissions from "./views/ProjectSubmissions";
import ProjectUpdates from "./views/ProjectUpdates";
import AccountPicker from "./components/AccountPicker";
import { ProjectsResponse } from "./lib/types/projects.types";
import AuthWrapper from "./components/AuthWrapper";
import useAuth from "./hooks/useAuth";

export default function Command() {
  const [accountName, setAccountName] = useState("");

  const { authHeaders } = useAuth();

  const ProjectsPayload = JSON.stringify([
    {
      operationName: "AppsPaginatedQuery",
      variables: {
        first: 10,
        accountName: accountName,
        filter: {
          sortByField: "LATEST_ACTIVITY_TIME",
        },
      },
      query:
        "query AppsPaginatedQuery($accountName: String!, $after: String, $first: Int, $before: String, $last: Int, $filter: AccountAppsFilterInput) {\n  account {\n    byName(accountName: $accountName) {\n      id\n      appsPaginated(\n        after: $after\n        first: $first\n        before: $before\n        last: $last\n        filter: $filter\n      ) {\n        edges {\n          node {\n            ...AppDataWithRepo\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AppDataWithRepo on App {\n  ...AppData\n  githubRepository {\n    metadata {\n      githubRepoName\n      githubRepoOwnerName\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}",
    },
  ]);
  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectsPayload,
    method: "post",
    headers: authHeaders,
    execute: accountName ? true : false,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Projects", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      const projects = data[0].data.account.byName.appsPaginated.edges.map((item) => item.node);
      return projects;
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

  return (
    <AuthWrapper>
      <List
        isLoading={isLoading}
        navigationTitle="Expo Projects"
        searchBarPlaceholder="Search Projects"
        searchBarAccessory={<AccountPicker onPick={(acc) => setAccountName(acc.name)} />}
      >
        {data && data.length > 0 ? (
          <>
            {data.map((project) => (
              <List.Item
                key={project.id}
                icon={
                  project.iconUrl
                    ? {
                        source: project.iconUrl,
                        mask: Image.Mask.Circle,
                      }
                    : Icon.MemoryChip
                }
                title={project.name}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Activity"
                      target={<ProjectTimeline project={project} />}
                      icon={Icon.LineChart}
                    />
                    <Action.Push
                      title="View Builds"
                      target={<ProjectBuilds project={project} />}
                      icon={Icon.HardDrive}
                    />
                    <Action.Push
                      title="View Submissions"
                      target={<ProjectSubmissions project={project} />}
                      icon={Icon.Leaf}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    />
                    <Action.Push
                      title="View Updates"
                      target={<ProjectUpdates project={project} />}
                      icon={Icon.Layers}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                    />
                    <Action.OpenInBrowser
                      title="Open on Expo"
                      url={`https://expo.dev/accounts/projects/${project.fullName}`}
                      icon={{
                        source: "expo.png",
                      }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                    {project.githubRepository && (
                      <Action.OpenInBrowser
                        title="Open on GitHub"
                        url={project.githubRepository.githubRepositoryUrl}
                        icon={{
                          source: "github.png",
                        }}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </>
        ) : (
          <List.EmptyView title="No projects found" />
        )}
      </List>
    </AuthWrapper>
  );
}
