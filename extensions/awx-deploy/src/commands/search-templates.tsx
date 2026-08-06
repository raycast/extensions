import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";
import { LaunchForm } from "../components/launch-form";
import { confirmAndLaunch } from "../common/launch";
import { WorkflowStagesList } from "../components/workflow-stages-list";
import {
  JobTemplate,
  Paginated,
  WorkflowJobTemplate,
  apiBase,
  authHeaders,
  jobWebUrl,
  launchTemplate,
  launchWorkflow,
  surveySpecUrl,
  templateWebUrl,
  workflowJobWebUrl,
  workflowTemplateWebUrl,
} from "../common/awx";
import { statusColor, statusIcon } from "../common/format";

const PAGE_SIZE = 30;

type View = "workflows" | "job_templates";

export default function SearchTemplates() {
  const [searchText, setSearchText] = useState("");
  const [view, setView] = useState<View>("workflows");

  const endpoint = view === "workflows" ? "workflow_job_templates" : "job_templates";

  const { isLoading, data, pagination, revalidate } = useFetch(
    (options: { page: number }) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        page_size: String(PAGE_SIZE),
        order_by: "name",
      });
      if (searchText.trim()) params.set("search", searchText.trim());
      return `${apiBase()}/${endpoint}/?${params.toString()}`;
    },
    {
      headers: authHeaders(),
      keepPreviousData: true,
      mapResult(result: Paginated<JobTemplate | WorkflowJobTemplate>) {
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
      searchBarPlaceholder={view === "workflows" ? "Search workflows…" : "Search job templates…"}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Template type" value={view} onChange={(v) => setView(v as View)}>
          <List.Dropdown.Item title="Workflows" value="workflows" icon={Icon.Layers} />
          <List.Dropdown.Item title="Job Templates" value="job_templates" icon={Icon.Terminal} />
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found" />
      {view === "workflows"
        ? (data as WorkflowJobTemplate[] | undefined)?.map((wf) => (
            <WorkflowRow key={wf.id} workflow={wf} onRefresh={revalidate} />
          ))
        : (data as JobTemplate[] | undefined)?.map((jt) => (
            <JobTemplateRow key={jt.id} template={jt} onRefresh={revalidate} />
          ))}
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

  const launch = (extraVars?: string) => launchWorkflow(workflow.id, extraVars);

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
                  surveyEndpoint={surveySpecUrl("workflow_job_templates", workflow.id)}
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

  const launch = (extraVars?: string) => launchTemplate(template.id, extraVars);

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
                  surveyEndpoint={surveySpecUrl("job_templates", template.id)}
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
