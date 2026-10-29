import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";
import { LaunchForm } from "../components/launch-form";
import { confirmAndLaunch } from "../common/launch";
import { WorkflowStagesList } from "../components/workflow-stages-list";
import {
  JobTemplate,
  LaunchPrompts,
  Paginated,
  UnifiedJobTemplate,
  WorkflowJobTemplate,
  apiBase,
  authHeaders,
  jobWebUrl,
  launchTemplate,
  launchWorkflow,
  templateWebUrl,
  workflowJobWebUrl,
  workflowTemplateWebUrl,
} from "../common/awx";
import { statusColor, statusIcon } from "../common/format";

const PAGE_SIZE = 30;

export default function SearchTemplates() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options: { page: number }) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        page_size: String(PAGE_SIZE),
        order_by: "name",
        type: "job_template,workflow_job_template",
      });
      if (searchText.trim()) params.set("search", searchText.trim());
      return `${apiBase()}/unified_job_templates/?${params.toString()}`;
    },
    {
      headers: authHeaders(),
      keepPreviousData: true,
      mapResult(result: Paginated<UnifiedJobTemplate>) {
        return { data: result.results, hasMore: Boolean(result.next) };
      },
      onError(error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load", message: error.message });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarPlaceholder="Search workflows and job templates…"
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found" />
      {data?.map((t) =>
        t.type === "workflow_job_template" ? (
          <WorkflowRow key={`wf-${t.id}`} workflow={t} onRefresh={revalidate} />
        ) : (
          <JobTemplateRow key={`jt-${t.id}`} template={t} onRefresh={revalidate} />
        ),
      )}
    </List>
  );
}

function statusAccessory(status?: string): List.Item.Accessory | undefined {
  if (!status) return undefined;
  return {
    tag: { value: status, color: statusColor(status) },
    icon: { source: statusIcon(status), tintColor: statusColor(status) },
    tooltip: `Last run: ${status}`,
  };
}

function WorkflowRow({ workflow, onRefresh }: { workflow: WorkflowJobTemplate; onRefresh: () => void }) {
  const accessories: List.Item.Accessory[] = [];
  const status = statusAccessory(workflow.summary_fields?.last_job?.status);
  if (status) accessories.push(status);

  const launch = (extraVars?: string, prompts?: LaunchPrompts) => launchWorkflow(workflow.id, extraVars, prompts);

  return (
    <List.Item
      icon={{ source: Icon.Layers, tintColor: Color.Purple }}
      title={workflow.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Launch with Variables…"
              icon={Icon.Pencil}
              target={
                <LaunchForm
                  name={workflow.name}
                  launch={launch}
                  jobUrl={workflowJobWebUrl}
                  template={{ kind: "workflow_job_templates", id: workflow.id }}
                />
              }
            />
            <Action.Push
              title="View Stages"
              icon={Icon.List}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "return" },
                Windows: { modifiers: ["ctrl"], key: "return" },
              }}
              target={<WorkflowStagesList workflow={workflow} />}
            />
            <Action
              title="Launch All Stages"
              icon={Icon.Rocket}
              onAction={() =>
                confirmAndLaunch({
                  name: workflow.name,
                  message: "This runs the entire workflow (all stages, in order).",
                  confirmTitle: "Launch Workflow",
                  launch: () => launch(),
                  jobUrl: workflowJobWebUrl,
                })
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in AWX"
              url={workflowTemplateWebUrl(workflow.id)}
              icon={getFavicon(workflowTemplateWebUrl(workflow.id), { fallback: Icon.Globe })}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CopyToClipboard
              title="Copy Name"
              content={workflow.name}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function JobTemplateRow({ template, onRefresh }: { template: JobTemplate; onRefresh: () => void }) {
  const accessories: List.Item.Accessory[] = [];
  if (template.summary_fields?.project?.name) {
    accessories.push({ tag: template.summary_fields.project.name, icon: Icon.Folder });
  }
  const status = statusAccessory(template.summary_fields?.last_job?.status);
  if (status) accessories.push(status);

  const launch = (extraVars?: string, prompts?: LaunchPrompts) => launchTemplate(template.id, extraVars, prompts);

  return (
    <List.Item
      icon={{ source: Icon.Terminal, tintColor: Color.Purple }}
      title={template.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Launch with Variables…"
              icon={Icon.Pencil}
              target={
                <LaunchForm
                  name={template.name}
                  launch={launch}
                  jobUrl={jobWebUrl}
                  template={{ kind: "job_templates", id: template.id }}
                />
              }
            />
            <Action
              title="Launch Template"
              icon={Icon.Rocket}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "return" },
                Windows: { modifiers: ["ctrl"], key: "return" },
              }}
              onAction={() =>
                confirmAndLaunch({
                  name: template.name,
                  message: template.description || undefined,
                  launch: () => launch(),
                  jobUrl: jobWebUrl,
                })
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in AWX"
              url={templateWebUrl(template.id)}
              icon={getFavicon(templateWebUrl(template.id), { fallback: Icon.Globe })}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CopyToClipboard
              title="Copy Name"
              content={template.name}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
