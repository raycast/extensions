import { showToast, Toast, Color, List, Icon, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE_URL } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { changeCase, humanDateTime, isObjectEmpty } from "../lib/utils";
import { ProjectSubmission, ProjectSubmissionResponse } from "../lib/types/project-submissions.types";
import Submission from "./SubmissionDetails";
import useAuth from "../hooks/useAuth";
import { Project } from "../lib/types/projects.types";

export default function ProjectSubmissions({ project }: { project: Project }) {
  const { authHeaders } = useAuth();

  const ProjectSubmissionsPayload = JSON.stringify([
    {
      operationName: "AppSubmissionsPaginatedQuery",
      variables: {
        first: 12,
        projectFullName: project.fullName,
      },
      query:
        "query AppSubmissionsPaginatedQuery($projectFullName: String!, $after: String, $first: Int, $before: String, $last: Int) {\n  app {\n    byFullName(fullName: $projectFullName) {\n      id\n      submissionsPaginated(after: $after, first: $first, before: $before, last: $last) {\n        edges {\n          node {\n            ...TableSubmission\n            __typename\n          }\n          __typename\n        }\n        pageInfo {\n          hasNextPage\n          hasPreviousPage\n          startCursor\n          endCursor\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment TableSubmission on Submission {\n  id\n  __typename\n  activityTimestamp\n  createdAt\n  initiatingActor {\n    id\n    __typename\n    displayName\n    ... on UserActor {\n      profilePhoto\n      __typename\n    }\n    ... on Robot {\n      isManagedByGitHubApp\n      __typename\n    }\n  }\n  app {\n    ...AppData\n    __typename\n  }\n  submittedBuild {\n    id\n    appVersion\n    __typename\n  }\n  submissionPlatform: platform\n  submissionStatus: status\n}\n\nfragment AppData on App {\n  __typename\n  id\n  icon {\n    url\n    primaryColor\n    __typename\n  }\n  iconUrl\n  fullName\n  name\n  slug\n  ownerAccount {\n    name\n    id\n    __typename\n  }\n  githubRepository {\n    githubRepositoryUrl\n    __typename\n  }\n  lastDeletionAttemptTime\n}",
    },
  ]);

  const { isLoading, data } = useFetch(BASE_URL, {
    body: ProjectSubmissionsPayload,
    method: "post",
    headers: authHeaders,
    execute: !isObjectEmpty(authHeaders),
    parseResponse: async (resp) => {
      const data = (await resp.json()) as ProjectSubmissionResponse;
      if ("errors" in data) {
        const errorMessages = (data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Error Fetching Project Submissions", message: errorMessages, style: Toast.Style.Failure });
        return [];
      }

      const submissions = data[0].data.app.byFullName?.submissionsPaginated.edges.map((edge) => edge.node);

      return submissions || [];
    },
    onError: (error) => {
      showToast({
        title: "Error fetching project Submissions",
        message: (error as Error)?.message || "",
        style: Toast.Style.Failure,
      });
    },
    initialData: [],
  });

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
      {data && data.length > 0 ? (
        <>
          {data.map((submission) => (
            <List.Item
              id={submission.id}
              key={submission.id}
              icon={{
                source: Icon.Leaf,
                tintColor: getTintColor(submission),
              }}
              title={getTitle(submission)}
              subtitle={humanDateTime(new Date(submission.activityTimestamp))}
              accessories={[
                {
                  tag: {
                    value: getStatusTag(submission),
                    color: getTintColor(submission),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Submission"
                    target={<Submission submissionId={submission.id} />}
                    icon={Icon.Box}
                  />
                  <Action.OpenInBrowser
                    title="View on Expo"
                    url={getExpoLink(submission)}
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
        <List.EmptyView title="No Submissions Found" />
      )}
    </List>
  );
}
