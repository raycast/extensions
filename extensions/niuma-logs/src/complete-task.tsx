import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getApiClient } from "./api";
import { useEffect, useState } from "react";
import convertTime from "./convert-time";
import dayjs from "dayjs";

const hudCompleteMessages = [
  "🎉 Great job! Keep it up!",
  "💹 Another win for productivity",
  "💰 Your time bank just got richer",
  "✅ One less thing to worry about",
];
const actionLabels = {
  markComplete: "Mark as Done",
  openInBrowser: "Open in Browser",
};
const accessoryLabels = {
  updatedAt: "Updated",
};
const toastLabels = {
  errorTitle: "Error",
};

type ApiIssue = Awaited<
  ReturnType<ReturnType<typeof getApiClient>["Issues"]["ListIssues"]>
>[number];

interface State {
  issues?: ApiIssue[];
  error?: Error;
}

export default function CompleteTask() {
  const [state, setState] = useState<State>({});

  const { repo } = getPreferenceValues();
  const client = getApiClient();

  useEffect(() => {
    async function loadIssues() {
      try {
        const issues = await client.Issues.ListIssues({
          repo,
          state: "open",
          order_by: "-last_acted_at",
        });

        setState({ issues });
      } catch (error) {
        setState({ error: error as Error });
      }
    }

    loadIssues();
  }, [repo, client]);

  if (state.error) {
    showToast({
      title: toastLabels.errorTitle,
      message: state.error.message,
      style: Toast.Style.Failure,
    });
  }

  const handleComplete = async (issue: ApiIssue) => {
    const patchIssueForm = {
      state: "closed",
      state_reason: "completed",
    } as Parameters<typeof client.Issues.UpdateIssue>[0]["patch_issue_form"];

    if (!issue.started_at || !issue.ended_at) {
      patchIssueForm.start_date = dayjs(issue.created_at).format("YYYY-MM-DD");
      patchIssueForm.end_date = dayjs().format("YYYY-MM-DD");
    }

    const updatedIssue = await client.Issues.UpdateIssue({
      repo,
      number: Number(issue.number),
      patch_issue_form: patchIssueForm,
    });

    if (updatedIssue.state === "closed") {
      showHUD(
        hudCompleteMessages[
          Math.floor(Math.random() * hudCompleteMessages.length)
        ],
      );

      setState({
        issues: state.issues?.filter((i) => i.number !== issue.number),
      });
    }
  };

  const { gitDomain } = getPreferenceValues();

  return (
    <List isLoading={!state.issues && !state.error}>
      {state.issues?.map((issue: ApiIssue) => (
        <List.Item
          key={issue.number}
          title={issue.title}
          actions={
            <ActionPanel>
              <Action
                title={actionLabels.markComplete}
                onAction={async () => {
                  await handleComplete(issue);
                }}
              />
              <Action.OpenInBrowser
                title={actionLabels.openInBrowser}
                url={`${gitDomain}/${repo}/-/issues/${issue.number}`}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: `${accessoryLabels.updatedAt} ${convertTime(
                issue.last_acted_at,
              )}`,
              icon: Icon.Clock,
            },
          ]}
        />
      ))}
    </List>
  );
}
