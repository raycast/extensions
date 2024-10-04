import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import {
  CreateIssueInput,
  useAssignees,
  useCreateIssue,
  useLabels,
  useMilestones,
  useSearchRepositories,
} from "../../api";
import React, { useState } from "react";
import { Label } from "../../zod";

export type CreateIssueProps = { repo?: string };

export function CreateIssue(props: CreateIssueProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateIssueInput>({
    initialValues: {
      repo: props.repo,
    },
    onSubmit(values) {
      values["labels"] = [
        ...values["labels"],
        ...Object.keys(values).reduce<string[]>((carry, key) => {
          if (key.startsWith("labels.")) {
            return [...carry, values[key as keyof CreateIssueInput] as string];
          }

          return carry;
        }, []),
      ];

      useCreateIssue({
        ...props,
        ...values,
      }).then(() => {
        showToast({
          style: Toast.Style.Success,
          title: "Issue Created",
          message: values.title,
        });

        pop();
      });
    },
    validation: {
      title: FormValidation.Required,
      repo: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!props.repo && <RepositoryDropdown {...itemProps.repo} />}
      {itemProps.repo.value && (
        <>
          <Form.TextField title="Title" placeholder="Issue title" {...itemProps.title} />
          <Form.TextArea title="Description" placeholder="Issue description (e.g **bold**).." {...itemProps.body} />
          <AssigneeDropdown repo={itemProps.repo.value} {...itemProps.assignees} />
          <LabelPicker repo={itemProps.repo.value} {...itemProps.labels} />
          <MilestoneDropdown repo={itemProps.repo.value} {...itemProps.milestone} />
          <Form.DatePicker title="Due date" {...itemProps.due_date} />
        </>
      )}
    </Form>
  );
}

function LabelPicker(props: Form.ItemProps<string[]> & { repo: string }) {
  const { data } = useLabels(props.repo);
  const [labels, setLabels] = useState<string[]>([]);

  if (!data || data.length === 0) {
    return <></>;
  }

  const grouped = data.reduce(
    (carry: { labels: Label[]; exclusive: Record<string, Label[]> }, label) => {
      if (!label.exclusive) {
        carry.labels = [...carry.labels, label];

        return carry;
      }

      const key = label.name.split("/")[0];
      carry.exclusive[key] = [...(carry.exclusive[key] || []), label];

      return carry;
    },
    { labels: [], exclusive: {} },
  );

  return (
    <>
      {grouped.labels && (
        <Form.TagPicker
          key="labels"
          id="labels"
          title="Labels"
          placeholder="Select labels"
          value={labels.filter((id) => grouped.labels.map(({ id }) => id).includes(parseInt(id)))}
          onChange={(selected) => setLabels(selected)}
        >
          {grouped.labels.map((label) => {
            return (
              <Form.TagPicker.Item
                key={label.id}
                icon={{ source: Icon.Circle, tintColor: label.color }}
                title={label.name}
                value={String(label.id)}
              />
            );
          })}
        </Form.TagPicker>
      )}

      {Object.keys(grouped.exclusive).map((key) => {
        return (
          <Form.Dropdown key={key} id={`labels.${key}`} title={key}>
            <Form.Dropdown.Item key="none" title="None" value="" />
            {grouped.exclusive[key].map((label) => {
              return (
                <Form.Dropdown.Item
                  key={label.id}
                  icon={{ source: Icon.Circle, tintColor: label.color }}
                  title={label.name}
                  value={String(label.id)}
                />
              );
            })}
          </Form.Dropdown>
        );
      })}
    </>
  );
}

function AssigneeDropdown(props: Form.ItemProps<string[]> & { repo: string }) {
  const { data } = useAssignees(props.repo);

  if (!data || data.length === 0) {
    return <></>;
  }

  return (
    <Form.TagPicker title="Assignees" {...props} placeholder="Select assignees">
      {data.map((user) => {
        return (
          <Form.TagPicker.Item
            key={user.id}
            icon={user.avatar_url && { source: user.avatar_url }}
            title={user.full_name || user.login || ""}
            value={user.login}
          />
        );
      })}
    </Form.TagPicker>
  );
}

function MilestoneDropdown(props: Form.ItemProps<string> & { repo: string }) {
  const { data, isLoading } = useMilestones(props.repo);

  if (!data || data.length === 0) {
    return <></>;
  }

  return (
    <Form.Dropdown isLoading={isLoading} title="Milestone" {...props}>
      <Form.Dropdown.Item key="none" title="None" value="" />
      {data.map((milestone) => {
        return (
          <Form.Dropdown.Item
            key={milestone.id}
            title={milestone.title}
            icon={Icon.Flag}
            value={String(milestone.id)}
          />
        );
      })}
    </Form.Dropdown>
  );
}

function RepositoryDropdown(props: Form.ItemProps<string>) {
  const { data, isLoading } = useSearchRepositories();

  if (!data || data.data.length === 0) {
    return <></>;
  }

  return (
    <Form.Dropdown isLoading={isLoading} title="Repository" {...props}>
      {data.data.map((repository) => {
        return <Form.Dropdown.Item key={repository.id} title={repository.full_name} value={repository.full_name} />;
      })}
    </Form.Dropdown>
  );
}
