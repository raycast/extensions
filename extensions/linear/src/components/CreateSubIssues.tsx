import { ActionPanel, Action, Clipboard, Icon, List, showToast, Toast, Color, useNavigation } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { nanoid } from "nanoid";
import { useState, useEffect, useMemo } from "react";

import { createSubIssue } from "../api/createIssue";
import { IssueResult } from "../api/getIssues";
import { getErrorMessage } from "../helpers/errors";
import { StateType } from "../helpers/states";
import useIssueDetail from "../hooks/useIssueDetail";
import useStates from "../hooks/useStates";

type CreateSubIssues = {
  issue: IssueResult;
};

type SubIssue = {
  id: string;
  title: string;
  description: string;
  selected: boolean;
};

export default function CreateSubIssues({ issue: initialIssue }: CreateSubIssues) {
  const { pop } = useNavigation();
  const { states } = useStates(initialIssue.team.id);

  const firstUnstartedState = useMemo(() => {
    const unstartedStates = states.filter((state) => state.type === StateType.unstarted);
    return unstartedStates[0];
  }, [states]);

  const { issue, isLoadingIssue } = useIssueDetail(initialIssue);
  const {
    data,
    isLoading: isLoadingAI,
    revalidate,
  } = useAI(
    `Act as a product manager for Linear issues. Break down a Linear issue into a list of sub-issues. 
    
Follow these instructions:
- The sub-issues should be actionable.
- Every sub-issue should have a title and description
- Don't repeat the issue title in the description.
- Create as many sub-issues as it makes sense. Don't create too many or too few.

Use this JSON format:
[
  {
    "title": "<title of sub-issue>",
    "description": "<description of sub-issue>"
  },
  ...
]

${
  issue.description
    ? `To give you more context and help in creating sub-issues, here's the Linear issue description:\n"""\n${issue.description}\n"""\n`
    : ""
}

Break down the Linear issue with this title: "${issue.title}"`,
    { execute: !!issue && !isLoadingIssue, creativity: 0.5 },
  );

  // We need to wait for the initial data to be processed before rendering the list
  // Otherwise, the empty state may be shown for a split second
  const [initialDataProcessed, setInitialDataProcessed] = useState(false);
  const [subIssues, setSubIssues] = useState<SubIssue[]>([]);

  useEffect(() => {
    if (!data || isLoadingAI) {
      return;
    }

    try {
      // AI sometimes prefix the JSON with a word like "Answer:"
      // In these cases, we need to remove the prefix before parsing the JSON
      const pattern = /\[[\s\S]*?\]/;
      const result = data.match(pattern);

      if (result && result[0]) {
        const issues = JSON.parse(result[0]) as Pick<SubIssue, "title" | "description">[];
        setSubIssues(issues.map((issue) => ({ ...issue, id: nanoid(), selected: true })));
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse AI results",
        message: getErrorMessage(error),
        primaryAction: { title: "Retry", onAction: revalidate },
        secondaryAction: {
          title: "Copy AI Result",
          onAction: () => Clipboard.copy(data),
        },
      });
    }

    setInitialDataProcessed(true);
  }, [data, isLoadingAI]);

  async function createSubIssues() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating sub-issues" });
      const subIssuesToCreate = subIssues.filter((issue) => issue.selected);

      await Promise.all(
        subIssuesToCreate.map((i) =>
          createSubIssue({
            teamId: issue.team.id,
            title: i.title,
            description: i.description,
            parentId: issue.id,
            stateId: firstUnstartedState?.id,
          }),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Created sub-issues" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to create Sub-Issues", message: getErrorMessage(error) });
    }
  }

  return (
    <List isLoading={isLoadingAI || !initialDataProcessed}>
      {subIssues?.map((issue) => (
        <List.Item
          key={issue.title}
          icon={issue.selected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          title={issue.title}
          subtitle={issue.description}
          actions={
            <ActionPanel>
              <Action
                title={issue.selected ? "Unselect Sub-Issue" : "Select Sub-Issue"}
                icon={issue.selected ? Icon.Circle : { source: Icon.CheckCircle, tintColor: Color.Green }}
                onAction={() =>
                  setSubIssues(
                    subIssues.map((i) => {
                      if (i.id === issue.id) {
                        return { ...i, selected: !i.selected };
                      }

                      return i;
                    }),
                  )
                }
              />

              <Action title="Create Sub-Issues" icon={Icon.Plus} onAction={() => createSubIssues()} />

              <Action title="Generate New Sub-Issues" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView
        title="No sub-issues were generated. Try again."
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    </List>
  );
}
