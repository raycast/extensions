import { ActionPanel, List, Action, Image, showToast, Toast, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { BASE_URL } from "./lib/constants";
import { isObjectEmpty } from "./lib/utils";
import { ErrorResponse } from "./lib/types";
import ProjectEnvs from "./views/ProjectEnvs";
import AccountPicker from "./components/AccountPicker";
import { ProjectsResponse } from "./lib/types/projects.types";
import AuthWrapper from "./components/AuthWrapper";
import useAuth from "./hooks/useAuth";

export default function Command() {
  const { authHeaders } = useAuth();

  const [accountName, setAccountName] = useState("");

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
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectsResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Projects", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.account.byName.appsPaginated.edges;
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
        navigationTitle="Enviroment Variables"
        searchBarPlaceholder="Pick a Project"
        searchBarAccessory={<AccountPicker onPick={(acc) => setAccountName(acc.name)} />}
      >
        {data ? (
          <>
            {data.map((project) => (
              <List.Item
                key={project.node.id}
                icon={
                  project.node.iconUrl
                    ? {
                        source: project.node.iconUrl,
                        mask: Image.Mask.Circle,
                      }
                    : Icon.MemoryChip
                }
                title={project.node.name}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Enviroment Variables"
                      target={<ProjectEnvs appFullName={project.node.fullName} />}
                      icon={Icon.LineChart}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </>
        ) : (
          <List.EmptyView />
        )}
      </List>
    </AuthWrapper>
  );
}
