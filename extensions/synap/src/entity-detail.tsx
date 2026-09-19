import { Action, ActionPanel, Color, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEntity, updateEntity, HubApiError, type HubGovernanceResult } from "./api/client";
import { entityIcon, capitalize, relativeDate, statusColor } from "./utils/formatters";
import { openAppUrl, openUrl } from "./utils/deeplinks";
import { describeConnectionError, ConnectionErrorActions, useConnection } from "./components/connection";
import type { SynapEntity } from "./api/types";

interface Props {
  entityId: string;
}

function EditEntityForm({ entity, onSaved }: { entity: SynapEntity; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: {
    title: string;
    content: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    url: string;
  }) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updateEntity(entity.id, {
        title: values.title.trim(),
        ...(values.status ? { status: values.status } : {}),
        ...(values.priority ? { priority: values.priority as "low" | "medium" | "high" | "urgent" } : {}),
        ...(values.dueDate ? { dueDate: values.dueDate.toISOString() } : {}),
        ...(values.url !== undefined ? { url: values.url } : {}),
        ...(values.content !== undefined ? { content: values.content } : {}),
      });
      const governanceResult = result as HubGovernanceResult;
      if (governanceResult.status === "denied") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Changes were not accepted",
          message: governanceResult.summary,
        });
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: governanceResult.status === "proposed" ? "Changes queued for review" : "Saved",
        ...(governanceResult.status === "proposed" && {
          message: governanceResult.reviewUrl ?? governanceResult.summary,
        }),
      });
      onSaved();
      pop();
    } catch (err) {
      const message = err instanceof HubApiError ? err.message : "Unknown error";
      await showToast({ style: Toast.Style.Failure, title: "Failed to save", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasStatus = entity.status != null;
  const hasPriority = entity.priority != null;
  const hasDueDate = entity.dueDate != null;
  const hasUrl = entity.url != null;

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Edit ${capitalize(entity.profileSlug)} Core Fields`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={entity.title} autoFocus />

      {entity.content !== undefined && (
        <Form.TextArea id="content" title="Content" defaultValue={entity.content ?? ""} />
      )}

      {hasUrl && <Form.TextField id="url" title="URL" defaultValue={entity.url ?? ""} />}

      {hasStatus && (
        <Form.Dropdown id="status" title="Status" defaultValue={entity.status ?? "todo"}>
          <Form.Dropdown.Item value="todo" title="To Do" icon={Icon.Circle} />
          <Form.Dropdown.Item
            value="in-progress"
            title="In Progress"
            icon={{ source: Icon.Dot, tintColor: Color.Blue }}
          />
          <Form.Dropdown.Item value="done" title="Done" icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} />
          <Form.Dropdown.Item value="cancelled" title="Cancelled" icon={Icon.XMarkCircle} />
        </Form.Dropdown>
      )}

      {hasPriority && (
        <Form.Dropdown id="priority" title="Priority" defaultValue={entity.priority ?? "medium"}>
          <Form.Dropdown.Item value="urgent" title="Urgent" icon={Icon.ExclamationMark} />
          <Form.Dropdown.Item value="high" title="High" icon={Icon.ArrowUp} />
          <Form.Dropdown.Item value="medium" title="Medium" icon={Icon.Minus} />
          <Form.Dropdown.Item value="low" title="Low" icon={Icon.ArrowDown} />
        </Form.Dropdown>
      )}

      {hasDueDate && (
        <Form.DatePicker
          id="dueDate"
          title="Due Date"
          type={Form.DatePicker.Type.Date}
          defaultValue={entity.dueDate ? new Date(entity.dueDate) : undefined}
        />
      )}
    </Form>
  );
}

function buildMarkdown(entity: SynapEntity): string {
  const lines: string[] = [];

  lines.push(`# ${entity.title || "(Untitled)"}`);
  lines.push("");

  // Status / priority / due date row
  const meta: string[] = [];
  if (entity.status) meta.push(`**Status:** ${capitalize(entity.status)}`);
  if (entity.priority) meta.push(`**Priority:** ${capitalize(entity.priority)}`);
  if (entity.dueDate) meta.push(`**Due:** ${relativeDate(entity.dueDate)}`);
  if (meta.length > 0) {
    lines.push(meta.join("  ·  "));
    lines.push("");
  }

  // URL
  if (entity.url) {
    lines.push(`**URL:** [${entity.url}](${entity.url})`);
    lines.push("");
  }

  // Long-form content
  if (entity.content) {
    lines.push("---");
    lines.push("");
    lines.push(entity.content);
    lines.push("");
  }

  // Extra properties (exclude already-rendered ones)
  const SKIP_PROPS = new Set(["status", "priority", "dueDate", "content", "url"]);
  const extraProps = Object.entries(entity.properties ?? {}).filter(
    ([k, v]) => !SKIP_PROPS.has(k) && v != null && v !== ""
  );
  if (extraProps.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("### Properties");
    lines.push("");
    for (const [key, value] of extraProps) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      lines.push(`- **${label}:** ${String(value)}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Created ${relativeDate(entity.createdAt)} · Updated ${relativeDate(entity.updatedAt)}*`);

  return lines.join("\n");
}

export default function EntityDetail({ entityId }: Props) {
  const { connection, podKey } = useConnection();
  const podUrl = connection?.podUrl ?? "";
  const { push } = useNavigation();
  const {
    data: entity,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise((id: string, _pod: string) => getEntity(id), [entityId, podKey]);

  if (error) {
    const { title, description } = describeConnectionError(error);
    return (
      <Detail
        markdown={`# ${title}\n\n${description}`}
        actions={
          <ActionPanel>
            <ConnectionErrorActions error={error} onRetry={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const { icon, tintColor } = entity ? entityIcon(entity.profileSlug) : { icon: Icon.Document, tintColor: undefined };

  const metadata = entity ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Type" icon={{ source: icon, tintColor }} text={capitalize(entity.profileSlug)} />
      {entity.status && (
        <Detail.Metadata.TagList title="Status">
          <Detail.Metadata.TagList.Item text={capitalize(entity.status)} color={statusColor(entity.status)} />
        </Detail.Metadata.TagList>
      )}
      {entity.priority && <Detail.Metadata.Label title="Priority" text={capitalize(entity.priority)} />}
      {entity.dueDate && (
        <Detail.Metadata.Label
          title="Due"
          text={relativeDate(entity.dueDate)}
          icon={new Date(entity.dueDate) < new Date() ? { source: Icon.ExclamationMark } : undefined}
        />
      )}
      {entity.workspaceId && <Detail.Metadata.Label title="Workspace" text={entity.workspaceId} />}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Created" text={relativeDate(entity.createdAt)} />
      <Detail.Metadata.Label title="Updated" text={relativeDate(entity.updatedAt)} />
    </Detail.Metadata>
  ) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={connection?.podName ? `Entity — ${connection.podName}` : undefined}
      markdown={entity ? buildMarkdown(entity) : ""}
      metadata={metadata}
      actions={
        entity ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Edit"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={() => push(<EditEntityForm entity={entity} onSaved={revalidate} />)}
              />
              <Action.OpenInBrowser title="Open in Synap" url={openAppUrl("entity", entity.id)} icon={Icon.Window} />
              {podUrl && (
                <Action.OpenInBrowser title="Open in Browser" url={openUrl(podUrl, entity.id)} icon={Icon.Globe} />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Title"
                content={entity.title}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Entity Id"
                content={entity.id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {podUrl && (
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={openUrl(podUrl, entity.id)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
              {entity.url && (
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={entity.url}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
