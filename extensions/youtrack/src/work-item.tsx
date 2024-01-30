import { IssueExtended, WorkItemSubmit } from "./interfaces";
import { WorkItem } from "youtrack-rest-client";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";

export function AddWork(props: {
  getIssueDetailsCb: () => Promise<IssueExtended> | null;
  createWorkItemCb: (workItem: WorkItem) => Promise<WorkItem> | null;
  link: string;
  instance: string;
}) {
  const [issue, setIssue] = useState<IssueExtended | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { pop } = useNavigation();
  useEffect(() => {
    async function fetchIssueDetails() {
      const issue = await props.getIssueDetailsCb();
      setIssue(issue);
    }

    fetchIssueDetails();
  }, []);

  if (!issue) {
    return <Detail isLoading />;
  }
  const workTypes = issue.workItemTypes?.length ? issue.workItemTypes : [];
  if (!workTypes.find((workType) => workType.id === "")) {
    workTypes.push({ id: "", name: "- without -" });
  }

  const handleSubmit = async (values: WorkItemSubmit) => {
    if (!props.createWorkItemCb) {
      return;
    }
    const workItem: WorkItem = {
      text: values.comment,
      date: values.date.valueOf(),
      duration: {
        presentation: values.time,
      },
    };
    try {
      await props.createWorkItemCb(workItem);
      setSubmitted(true);
      showToast({
        style: Toast.Style.Success,
        title: "Work item added",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed adding work item",
        // @ts-expect-error message is not defined on Error
        message: `${error?.message || "Unknown error occurred"}`,
      });
      return;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {submitted ? (
            <Action icon={Icon.ArrowLeft} title="Go Back" onAction={pop} />
          ) : (
            <Action.SubmitForm icon={Icon.Upload} title="Add work" onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`${issue.id} - ${issue.summary}`} />
      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />
      <Form.TextField id="time" title="Spent time" placeholder="1h 15m" autoFocus />
      <Form.Dropdown id="workTypeId" title="Worktype" storeValue defaultValue={""}>
        {workTypes.map((workType) => (
          <Form.Dropdown.Item
            key={workType.id}
            value={workType.id || ""}
            title={workType.name || `- missing (id: ${workType.id}) -`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="comment" title="Comment" placeholder="" />
    </Form>
  );
}
