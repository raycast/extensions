import type { IssueExtended, WorkItem, WorkItemSubmit, WorkItemType } from "./interfaces";
import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { isDurationValid } from "./utils";
import { useForm } from "@raycast/utils";

export function AddWork(props: {
  getIssueDetailsCb: () => Promise<IssueExtended | void>;
  createWorkItemCb: (workItem: WorkItem) => Promise<WorkItem | void>;
  link: string;
  instance: string;
}) {
  const emptyWorkType: WorkItemType = useMemo(() => ({ id: "", name: "No type" }), []);
  const [issue, setIssue] = useState<IssueExtended | null>(null);
  const [workTypes, setWorkTypes] = useState<WorkItemType[]>([emptyWorkType]);
  const { pop } = useNavigation();
  const { getIssueDetailsCb, createWorkItemCb } = props;

  const { handleSubmit, itemProps } = useForm<WorkItemSubmit>({
    async onSubmit({ comment, date, workTypeId, time }) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting work item",
      });

      if (!createWorkItemCb) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed adding work item, missing callback function";
        return;
      }

      const workItem: WorkItem = {
        text: comment,
        date: date.valueOf(),
        type: workTypeId ? workTypes.find((type) => type.id === workTypeId) : undefined,
        duration: {
          presentation: time,
        },
      };

      try {
        await props.createWorkItemCb(workItem);
        toast.style = Toast.Style.Success;
        toast.title = "Work item added";
        toast.primaryAction = {
          title: "Go Back",
          onAction: pop,
          shortcut: {
            modifiers: ["cmd"],
            key: "enter",
          },
        };
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed adding work item";
        // @ts-expect-error message is not defined on Error
        toast.message = `${error?.message || "Unknown error occurred"}`;
      }
    },
    validation: {
      time: (value) => {
        if (!value) {
          return "Spent time is required";
        }
        if (!isDurationValid(value)) {
          return "Invalid duration format";
        }
      },
    },
  });

  useEffect(() => {
    async function fetchIssueDetails() {
      const issue = await getIssueDetailsCb();
      if (issue) {
        setIssue(issue);
        if (issue.workItemTypes?.length) {
          setWorkTypes([emptyWorkType, ...issue.workItemTypes]);
        }
      }
    }

    fetchIssueDetails();
  }, [itemProps.workTypeId, getIssueDetailsCb, emptyWorkType]);

  if (!issue) {
    return <Detail isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Upload}
            title="Add Work"
            onSubmit={(values: WorkItemSubmit) => {
              handleSubmit(values);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`${issue.id} - ${issue.summary}`} />
      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />
      <Form.TextField title="Spent Time" placeholder="1h 15m" autoFocus {...itemProps.time} />
      <Form.Dropdown id="workTypeId" title="Worktype" storeValue defaultValue={""}>
        {workTypes.map((workType) => (
          <Form.Dropdown.Item
            key={workType.id}
            value={workType.id || ""}
            title={workType.name || `- missing (id: ${workType.id}) -`}
            keywords={[workType.name || ""]}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="comment" title="Comment" placeholder="" />
    </Form>
  );
}
