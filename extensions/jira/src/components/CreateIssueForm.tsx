import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import {
  getIssuePriorities,
  createIssue,
  getCreateIssueMetadata,
  Component,
  Version,
  addAttachment,
} from "../api/issues";
import { getLabels } from "../api/labels";
import { getProjects } from "../api/projects";
import { getUsers } from "../api/users";
import { getErrorMessage } from "../helpers/errors";
import { CustomFieldSchema, getCustomFieldsForCreateIssue } from "../helpers/issues";

import FormParentDropdown from "./FormParentDropdown";
import IssueDetail from "./IssueDetail";
import IssueFormCustomFields from "./IssueFormCustomFields";

export type IssueFormValues = {
  projectId: string;
  issueTypeId: string;
  summary: string;
  description: string;
  parent: string;
  assigneeId: string;
  priorityId: string;
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  dueDate?: Date | null;
  attachments: string[];
} & Record<string, unknown>;

type Preferences = {
  signature: boolean;
};

type CreateIssueFormProps = {
  draftValues?: IssueFormValues;
  enableDrafts?: boolean;
};

export default function CreateIssueForm({ draftValues, enableDrafts = true }: CreateIssueFormProps) {
  const { push } = useNavigation();
  const { signature } = getPreferenceValues<Preferences>();

  const { data: projects } = useCachedPromise(() => getProjects());
  const { data: users } = useCachedPromise(() => getUsers());
  const { data: priorities } = useCachedPromise(() => getIssuePriorities());
  const { data: labels } = useCachedPromise(() => getLabels());

  // There's a slight jump on issue types when launching the command since they're
  // retrieved based on the project. Let's cache the last project ID to avoid that
  const [lastProject, setLastProject] = useCachedState<string>("last-project");

  const [customFieldInitialValues, setCustomFieldInitialValues] = useState({});
  const [customFieldsValidation, setCustomFieldsValidation] = useState({});

  const { handleSubmit, itemProps, values, reset, focus } = useForm<IssueFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue" });

      try {
        const issue = await createIssue(values, { signature, customFields: selectedIssueType?.fields });

        if (issue) {
          toast.style = Toast.Style.Success;
          toast.title = `Created issue • ${issue.key}`;
          toast.primaryAction = {
            title: "Open Issue",
            shortcut: { modifiers: ["shift", "cmd"], key: "o" },
            onAction: () => push(<IssueDetail issueKey={issue.key} />),
          };
          toast.secondaryAction = {
            title: `Copy Issue Key`,
            shortcut: { modifiers: ["shift", "cmd"], key: "c" },
            onAction: () => {
              Clipboard.copy(issue.key);
              showToast({ style: Toast.Style.Success, title: "Copied to clipboard", message: issue.key });
            },
          };

          reset({
            projectId: values.projectId,
            issueTypeId: values.issueTypeId,
            summary: "",
            parent: "",
            description: "",
            assigneeId: values.assigneeId,
            priorityId: values.priorityId,
            labels: [],
            components: [],
            fixVersions: [],
            dueDate: null,
            attachments: [],
            ...customFieldInitialValues,
          });

          focus("summary");

          if (values.attachments.length > 0) {
            const attachmentWord = values.attachments.length === 1 ? "attachment" : "attachments";
            try {
              toast.message = `Uploading ${attachmentWord}…`;
              await Promise.all(values.attachments.map((attachment) => addAttachment(issue.key, attachment)));
              toast.message = `Successfully uploaded ${attachmentWord}`;
            } catch (error) {
              toast.message = `Failed uploading ${attachmentWord}\n${getErrorMessage(error)}`;
            }
          }
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed creating issue";
        toast.message = getErrorMessage(error);
      }
    },
    initialValues: draftValues || {
      projectId: lastProject || "",
      issueTypeId: "",
      summary: "",
      parent: "",
      description: "",
      assigneeId: "",
      priorityId: "",
      labels: [],
      components: [],
      fixVersions: [],
      dueDate: null,
    },
    validation: {
      projectId: FormValidation.Required,
      issueTypeId: FormValidation.Required,
      summary: FormValidation.Required,
      ...customFieldsValidation,
    },
  });

  useEffect(() => {
    setLastProject(values.projectId);
  }, [values.projectId]);

  const { data: issueMetadata } = useCachedPromise(
    (projectId) => getCreateIssueMetadata(projectId),
    [values.projectId],
    { execute: !!values.projectId }
  );

  const selectedProject = projects?.find((project) => project.id === values.projectId);

  // We only query one project in the getCreateIssueMetadata call
  // It's safe to assume the issue types will always correspond to the first element
  const issueTypes = issueMetadata?.[0].issuetypes;

  const selectedIssueType = issueTypes?.find((issueType) => issueType.id === values.issueTypeId);

  const epicsOnly = !selectedIssueType?.subtask;
  const issueLinksAutocompleteUrl = selectedIssueType?.fields.issuelinks.autoCompleteUrl;

  const components = selectedIssueType?.fields.components?.allowedValues as Component[];
  const fixVersions = selectedIssueType?.fields.fixVersions?.allowedValues as Version[];
  const dueDate = selectedIssueType?.fields.duedate;

  const { unknownCustomFields, customFields } = useMemo(() => {
    if (selectedIssueType) {
      const { unknownCustomFields, customFields, initialValues, validation } =
        getCustomFieldsForCreateIssue(selectedIssueType);

      setCustomFieldInitialValues(initialValues);
      setCustomFieldsValidation(validation);

      return { unknownCustomFields, customFields };
    }

    return { unknownCustomFields: "", customFields: [] };
  }, [selectedIssueType]);

  // The epic label field needs to be inserted before the summary field
  const epicNameField = customFields.find((field) => field.fieldSchema === CustomFieldSchema.epicLabel);
  const otherCustomFields = customFields.filter((field) => field.fieldSchema !== CustomFieldSchema.epicLabel);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Issue" icon={Icon.Plus} />
        </ActionPanel>
      }
      enableDrafts={enableDrafts}
    >
      <Form.Dropdown {...itemProps.projectId} title="Project" storeValue>
        {projects?.map((project) => {
          return (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={`${project.name} (${project.key})`}
              icon={project.avatarUrls["32x32"]}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.issueTypeId} title="Issue Type" storeValue>
        {issueTypes?.map((issueType) => {
          return (
            <Form.Dropdown.Item
              key={issueType.id}
              value={issueType.id}
              title={issueType.name}
              icon={issueType.iconUrl}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Separator />

      {epicNameField ? (
        <Form.TextField {...(itemProps[epicNameField.key] as Form.ItemProps<string>)} title={epicNameField.name} />
      ) : null}

      <Form.TextField {...itemProps.summary} title="Summary" placeholder="Short summary for the issue" />

      {issueLinksAutocompleteUrl && selectedProject ? (
        <FormParentDropdown
          {...itemProps.parent}
          autocompleteUrl={issueLinksAutocompleteUrl}
          epicsOnly={epicsOnly}
          projectId={selectedProject.id}
        />
      ) : null}

      <Form.TextArea
        {...itemProps.description}
        title="Description"
        placeholder="Fields supports Markdown, e.g **bold**"
        enableMarkdown
      />

      <Form.Dropdown {...itemProps.assigneeId} title="Assignee" storeValue>
        <Form.Dropdown.Item title="Unassigned" value="" icon={Icon.Person} />

        {users?.map((user) => {
          return (
            <Form.Dropdown.Item
              key={user.accountId}
              value={user.accountId}
              title={user.displayName}
              icon={user.avatarUrls["32x32"]}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.priorityId} title="Priority">
        {priorities?.map((priority) => {
          return (
            <Form.Dropdown.Item key={priority.id} value={priority.id} title={priority.name} icon={priority.iconUrl} />
          );
        })}
      </Form.Dropdown>

      <Form.FilePicker title="Attachments" {...itemProps.attachments} canChooseDirectories={false} />

      {labels && labels.length > 0 ? (
        <Form.TagPicker {...itemProps.labels} title="Labels" placeholder="Start typing label name…">
          {labels.map((label) => {
            return <Form.TagPicker.Item key={label} value={label} title={label} icon={Icon.Tag} />;
          })}
        </Form.TagPicker>
      ) : null}

      {components && components.length > 0 ? (
        <Form.TagPicker {...itemProps.components} title="Components" placeholder="Start typing component name…">
          {components.map((component) => {
            return <Form.TagPicker.Item key={component.id} title={component.name} value={component.id} />;
          })}
        </Form.TagPicker>
      ) : null}

      {fixVersions && fixVersions.length > 0 ? (
        <Form.TagPicker {...itemProps.fixVersions} title="Fix Versions" placeholder="Start typing fix version…">
          {fixVersions.map((version) => {
            return <Form.TagPicker.Item key={version.id} title={version.name} value={version.id} />;
          })}
        </Form.TagPicker>
      ) : null}

      {dueDate ? (
        <Form.DatePicker {...itemProps.dueDate} type={Form.DatePicker.Type.Date} title={dueDate.name} />
      ) : null}

      {otherCustomFields.length > 0 ? (
        <>
          <Form.Separator />

          <IssueFormCustomFields fields={otherCustomFields} itemProps={itemProps} users={users} />

          {unknownCustomFields !== "" ? (
            <Form.Description
              title="Unknown fields"
              text={`We cannot display the following fields: ${unknownCustomFields}`}
            />
          ) : null}
        </>
      ) : null}
    </Form>
  );
}
