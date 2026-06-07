import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import {
  prepareBulkOperation,
  publishPreparedBulkOperation,
} from "./bulk-engine";
import {
  buildPreparedOperationMarkdown,
  buildPublishedOperationMarkdown,
} from "./formatting";
import type {
  BulkOperation,
  FirebaseValueType,
  PreparedBulkResult,
  ProjectConfig,
  ProjectGroup,
} from "./types";

type OperationType = BulkOperation["type"];

interface BulkOperationFormProps {
  availableProjects: ProjectConfig[];
  groups: ProjectGroup[];
  fixedProjectIds?: string[];
  initial?: {
    operationType?: OperationType;
    key?: string;
    rawValue?: string;
    firebaseValueType?: FirebaseValueType;
    description?: string;
    conditionName?: string;
    targetKey?: string;
    sourceKey?: string;
    expression?: string;
    tagColor?: string;
    name?: string;
  };
  onCompleted?: () => void;
}

interface BulkOperationFormValues {
  operationType: OperationType;
  selectedProjectIds?: string[];
  groupId?: string;
  key?: string;
  rawValue?: string;
  firebaseValueType?: FirebaseValueType;
  description?: string;
  conditionName?: string;
  targetKey?: string;
  sourceKey?: string;
  expression?: string;
  tagColor?: string;
  name?: string;
  deleteSource?: boolean;
}

function selectProjects(
  availableProjects: ProjectConfig[],
  groups: ProjectGroup[],
  values: BulkOperationFormValues,
  fixedProjectIds?: string[],
): ProjectConfig[] {
  if (fixedProjectIds && fixedProjectIds.length > 0) {
    const ids = new Set(fixedProjectIds);
    return availableProjects.filter((project) => ids.has(project.id));
  }

  const ids = new Set<string>(values.selectedProjectIds ?? []);
  if (values.groupId) {
    const group = groups.find((entry) => entry.id === values.groupId);
    for (const projectId of group?.projectIds ?? []) ids.add(projectId);
  }
  return availableProjects.filter((project) => ids.has(project.id));
}

function buildOperation(values: BulkOperationFormValues): BulkOperation {
  switch (values.operationType) {
    case "upsert-parameter":
      if (!values.key?.trim()) throw new Error("Enter the parameter key.");
      return {
        type: "upsert-parameter",
        key: values.key.trim(),
        rawValue: values.rawValue ?? "",
        firebaseValueType: values.firebaseValueType ?? "STRING",
        description: values.description?.trim() || undefined,
      };
    case "delete-parameter":
      if (!values.key?.trim()) throw new Error("Enter the parameter key.");
      return { type: "delete-parameter", key: values.key.trim() };
    case "set-conditional-value":
      if (!values.key?.trim() || !values.conditionName?.trim()) {
        throw new Error("Enter both the parameter key and condition name.");
      }
      return {
        type: "set-conditional-value",
        key: values.key.trim(),
        conditionName: values.conditionName.trim(),
        rawValue: values.rawValue ?? "",
        firebaseValueType: values.firebaseValueType,
        description: values.description?.trim() || undefined,
      };
    case "remove-conditional-value":
      if (!values.key?.trim() || !values.conditionName?.trim()) {
        throw new Error("Enter both the parameter key and condition name.");
      }
      return {
        type: "remove-conditional-value",
        key: values.key.trim(),
        conditionName: values.conditionName.trim(),
      };
    case "clone-parameter":
      if (!values.sourceKey?.trim() || !values.targetKey?.trim()) {
        throw new Error("Enter both the source key and target key.");
      }
      return {
        type: "clone-parameter",
        sourceKey: values.sourceKey.trim(),
        targetKey: values.targetKey.trim(),
        deleteSource: values.deleteSource ?? false,
      };
    case "upsert-condition":
      if (!values.name?.trim() || !values.expression?.trim()) {
        throw new Error("Enter both the condition name and expression.");
      }
      return {
        type: "upsert-condition",
        name: values.name.trim(),
        expression: values.expression.trim(),
        tagColor: values.tagColor?.trim() || undefined,
      };
    case "delete-condition":
      if (!values.name?.trim()) throw new Error("Enter the condition name.");
      return { type: "delete-condition", name: values.name.trim() };
  }
}

function usesParameter(operationType: OperationType): boolean {
  return [
    "upsert-parameter",
    "delete-parameter",
    "set-conditional-value",
    "remove-conditional-value",
    "clone-parameter",
  ].includes(operationType);
}

function usesCondition(operationType: OperationType): boolean {
  return [
    "set-conditional-value",
    "remove-conditional-value",
    "upsert-condition",
    "delete-condition",
  ].includes(operationType);
}

function usesConditionCrudName(operationType: OperationType): boolean {
  return ["upsert-condition", "delete-condition"].includes(operationType);
}

function usesRawValue(operationType: OperationType): boolean {
  return ["upsert-parameter", "set-conditional-value"].includes(operationType);
}

function usesDescription(operationType: OperationType): boolean {
  return ["upsert-parameter", "set-conditional-value"].includes(operationType);
}

function usesCloneSource(operationType: OperationType): boolean {
  return operationType === "clone-parameter";
}

export function BulkOperationForm({
  availableProjects,
  groups,
  fixedProjectIds,
  initial,
  onCompleted,
}: BulkOperationFormProps) {
  const { push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>(
    initial?.operationType ?? "upsert-parameter",
  );
  const lockedProjects = fixedProjectIds && fixedProjectIds.length > 0;
  const defaultSelectedIds =
    fixedProjectIds ?? availableProjects.map((project) => project.id);

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview Changes"
            icon={Icon.Eye}
            onSubmit={async (rawValues) => {
              const values = rawValues as BulkOperationFormValues;
              try {
                const projects = selectProjects(
                  availableProjects,
                  groups,
                  values,
                  fixedProjectIds,
                );
                if (projects.length === 0) {
                  throw new Error("Select at least one project.");
                }

                const operation = buildOperation(values);
                setIsSubmitting(true);
                const prepared = await prepareBulkOperation(
                  projects,
                  operation,
                );
                push(
                  <OperationPreview
                    prepared={prepared}
                    onCompleted={onCompleted}
                  />,
                );
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to prepare batch",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      {!lockedProjects ? (
        <>
          <Form.Dropdown id="groupId" title="Saved Group">
            <Form.Dropdown.Item value="" title="No group" />
            {groups.map((group) => (
              <Form.Dropdown.Item
                key={group.id}
                value={group.id}
                title={group.name}
              />
            ))}
          </Form.Dropdown>

          <Form.TagPicker
            id="selectedProjectIds"
            title="Projects"
            defaultValue={defaultSelectedIds}
          >
            {availableProjects.map((project) => (
              <Form.TagPicker.Item
                key={project.id}
                value={project.id}
                title={project.displayName}
              />
            ))}
          </Form.TagPicker>
        </>
      ) : (
        <Form.Description
          text={`Fixed scope:${availableProjects
            .filter((project) => defaultSelectedIds.includes(project.id))
            .map((project) => project.displayName)
            .join(", ")}`}
        />
      )}

      <Form.Dropdown
        id="operationType"
        title="Operation"
        value={operationType}
        onChange={(newValue) => setOperationType(newValue as OperationType)}
      >
        <Form.Dropdown.Item
          value="upsert-parameter"
          title="Create or Update Parameter"
        />
        <Form.Dropdown.Item value="delete-parameter" title="Delete Parameter" />
        <Form.Dropdown.Item
          value="set-conditional-value"
          title="Set Conditional Value"
        />
        <Form.Dropdown.Item
          value="remove-conditional-value"
          title="Remove Conditional Value"
        />
        <Form.Dropdown.Item value="clone-parameter" title="Clone Parameter" />
        <Form.Dropdown.Item
          value="upsert-condition"
          title="Create or Update Condition"
        />
        <Form.Dropdown.Item value="delete-condition" title="Delete Condition" />
      </Form.Dropdown>

      {usesParameter(operationType) && !usesCloneSource(operationType) ? (
        <Form.TextField
          id="key"
          title="Parameter Key"
          defaultValue={initial?.key}
          placeholder="feature_flag_key"
        />
      ) : null}
      {usesCloneSource(operationType) ? (
        <>
          <Form.TextField
            id="sourceKey"
            title="Source Key"
            defaultValue={initial?.sourceKey}
            placeholder="legacy_flag"
          />
          <Form.TextField
            id="targetKey"
            title="Target Key"
            defaultValue={initial?.targetKey}
            placeholder="new_flag"
          />
        </>
      ) : null}
      {usesCondition(operationType) ? (
        <Form.TextField
          id={usesConditionCrudName(operationType) ? "name" : "conditionName"}
          title="Condition Name"
          defaultValue={
            usesConditionCrudName(operationType)
              ? initial?.name
              : initial?.conditionName
          }
          placeholder={
            usesConditionCrudName(operationType) ? "Android Beta" : "iOS"
          }
        />
      ) : null}
      {usesRawValue(operationType) ? (
        <>
          <Form.Dropdown
            id="firebaseValueType"
            title="Firebase Value Type"
            defaultValue={initial?.firebaseValueType ?? "STRING"}
          >
            <Form.Dropdown.Item value="STRING" title="STRING" />
            <Form.Dropdown.Item value="BOOLEAN" title="BOOLEAN" />
            <Form.Dropdown.Item value="NUMBER" title="NUMBER" />
            <Form.Dropdown.Item value="JSON" title="JSON" />
          </Form.Dropdown>
          <Form.TextArea
            id="rawValue"
            title="Raw Value"
            defaultValue={initial?.rawValue}
            placeholder='true | 42 | {"foo":"bar"}'
          />
        </>
      ) : null}
      {usesDescription(operationType) ? (
        <Form.TextField
          id="description"
          title="Description"
          defaultValue={initial?.description}
          placeholder="Optional parameter description"
        />
      ) : null}
      {operationType === "upsert-condition" ? (
        <>
          <Form.TextArea
            id="expression"
            title="Condition Expression"
            defaultValue={initial?.expression}
            placeholder="app.id == '...'"
          />
          <Form.TextField
            id="tagColor"
            title="Condition Tag Color"
            defaultValue={initial?.tagColor}
            placeholder="BLUE"
          />
        </>
      ) : null}
      {usesCloneSource(operationType) ? (
        <Form.Checkbox
          id="deleteSource"
          title="Delete Source After Clone"
          label="Delete source parameter after clone"
          defaultValue={false}
        />
      ) : null}
      <Form.Description
        text={[
          usesParameter(operationType)
            ? "Use raw value exactly as Firebase should receive it."
            : null,
          usesCondition(operationType)
            ? "Conditions are edited as raw expressions in v1."
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </Form>
  );
}

export function OperationPreview({
  prepared,
  onCompleted,
}: {
  prepared: PreparedBulkResult[];
  onCompleted?: () => void;
}) {
  const [publishResultsMarkdown, setPublishResultsMarkdown] = useState<
    string | null
  >(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const readyCount = prepared.filter(
    (result) => result.status === "preview",
  ).length;

  if (publishResultsMarkdown) {
    return (
      <Detail
        markdown={publishResultsMarkdown}
        actions={
          <ActionPanel>
            <Action
              title="Copy Result"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(publishResultsMarkdown);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isPublishing}
      isShowingDetail
      navigationTitle="Bulk Preview"
      searchBarPlaceholder="Review project-level preview results"
    >
      {prepared.map((result) => (
        <List.Item
          key={result.project.id}
          title={result.project.displayName}
          subtitle={
            result.status === "preview"
              ? result.changes.join(" · ")
              : result.status
          }
          accessories={
            result.error
              ? [{ icon: Icon.ExclamationMark, tooltip: result.error }]
              : []
          }
          detail={
            <List.Item.Detail
              markdown={buildPreparedOperationMarkdown([result])}
            />
          }
          actions={
            <ActionPanel>
              {readyCount > 0 ? (
                <Action
                  title="Publish Ready Changes"
                  icon={Icon.Upload}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Publish Remote Config changes?",
                      message: `This will publish changes to ${readyCount} project(s).`,
                      primaryAction: {
                        title: "Publish",
                        style: Alert.ActionStyle.Destructive,
                      },
                    });
                    if (!confirmed) return;

                    setIsPublishing(true);
                    try {
                      const results =
                        await publishPreparedBulkOperation(prepared);
                      const markdown = buildPublishedOperationMarkdown(results);
                      setPublishResultsMarkdown(markdown);
                      onCompleted?.();
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Publish finished",
                        message: results
                          .map(
                            (entry) =>
                              `${entry.project.displayName}: ${entry.status}`,
                          )
                          .join(" | "),
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Publish failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    } finally {
                      setIsPublishing(false);
                    }
                  }}
                />
              ) : null}
              <Action
                title="Copy Preview"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(
                    buildPreparedOperationMarkdown(prepared),
                  );
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {prepared.length === 0 ? (
        <List.EmptyView
          title="No preview result"
          description="The selected operation returned no projects."
        />
      ) : null}
      <List.Section title="Summary">
        <List.Item
          title="Preview Summary"
          detail={
            <List.Item.Detail
              markdown={buildPreparedOperationMarkdown(prepared)}
            />
          }
        />
      </List.Section>
    </List>
  );
}
