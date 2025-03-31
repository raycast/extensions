import { showToast, Toast, Color, List, Icon, ActionPanel, Action, ImageMask } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { getAuthHeaders, changeCase, humanDateTime } from "../lib/utils";
import { ProjectSubmission, ProjectSubmissionResponse } from "../lib/types/project-submissions.types";
import Submission from "./SubmissionDetails";

export default function ProjectSubmissions({ appFullName }: { appFullName: string }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  const ProjectSubmissionsPayload = JSON.stringify([
    {
      operationName: "AppSubmissionsPaginatedQuery",
      variables: {
        first: 12,
        projectFullName: appFullName,
      },
      query:
        "query AppSubmissionsPaginatedQuery($projectFullName: String!, $after: String, $first: Int, $before: String, $last: Int) {\n  app {\n    byFullName(fullName: $projectFullName) {\n      id\n      submissionsPaginated(after: $after, first: $first, before: $before, last: $last) {\n        edges {\n          node {\n            ...TableSubmission\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TableSubmission on Submission {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  initiatingActor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  submittedBuild {\n    id\n    appVersion\n    __typename\n  }\n  submissionPlatform: platform\n  submissionStatus: status\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectSubmissionsPayload,
    method: "post",
    headers: headers || {},
    execute: headers === null ? false : true,
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectSubmissionResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Submissions", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      return data[0].data.app.byFullName?.submissionsPaginated.edges || [];
    },
    onError: (error) => {
      console.log(error);
      showToast({
        title: "Error fetching project Submissions",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

  useEffect(() => {
    async function fetchHeaders() {
      const authHeaders = await getAuthHeaders();
      setHeaders(authHeaders);
    }
    fetchHeaders();
  }, []);

  function getTintColor(submission: ProjectSubmission) {
    if (submission.submissionStatus === "FINISHED") {
      return Color.Green;
    }
    if (submission.submissionStatus === "FAILED" || submission.submissionStatus === "ERRORED") {
      return Color.Red;
    }
    return Color.Blue;
  }

  function getStatusTag(submission: ProjectSubmission) {
    return changeCase(submission.submissionStatus || "", "sentence");
  }

  function getTitle(activity: ProjectSubmission) {
    const platform = changeCase(activity.submissionPlatform || "", "upper");
    if (platform === "IOS") {
      return `${platform} Appstore Submission`;
    } else {
      return `${platform} PlayStore Submission`;
    }
  }

  function getExpoLink(activity: ProjectSubmission) {
    const link = `https://expo.dev/accounts/${activity.app.ownerAccount?.name}/projects/${activity.app.name}/${activity.__typename}s/${activity.id}`;
    return link.toLowerCase();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Submissions">
      {data ? (
        <>
          {data.map((submission) => (
            <List.Item
              id={submission.node.id}
              key={submission.node.id}
              icon={{
                source: Icon.Leaf,
                tintColor: getTintColor(submission.node),
              }}
              title={getTitle(submission.node)}
              subtitle={humanDateTime(new Date(submission.node.activityTimestamp))}
              accessories={[
                {
                  tag: {
                    value: getStatusTag(submission.node),
                    color: getTintColor(submission.node),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Submission"
                    target={<Submission submissionId={submission.node.id} />}
                    icon={Icon.Box}
                  />
                  <Action.OpenInBrowser
                    title="View on Expo"
                    url={getExpoLink(submission.node)}
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
        <List.EmptyView title="No Submissions Found" />
      )}
    </List>
  );
}
