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
import { getStrings } from "./i18n";

type ApiIssue = Awaited<
  ReturnType<ReturnType<typeof getApiClient>["Issues"]["ListIssues"]>
>[number];

interface State {
  issues?: ApiIssue[];
  error?: Error;
}

export default function CompleteTask() {
  const [state, setState] = useState<State>({});
  const strings = getStrings();

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
  }, []);

  if (state.error) {
    showToast({
      title: strings.toasts.errorTitle,
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
        strings.hud.complete[
          Math.floor(Math.random() * strings.hud.complete.length)
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
                title={strings.actions.markComplete}
                onAction={async () => {
                  await handleComplete(issue);
                }}
              />
              <Action.OpenInBrowser
                title={strings.actions.openInBrowser}
                url={`${gitDomain}/${repo}/-/issues/${issue.number}`}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: `${strings.labels.updatedAt} ${convertTime(
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
