import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { LaunchForm } from "./launch-form";
import { confirmAndLaunch } from "../common/launch";
import {
  Paginated,
  WorkflowJobTemplate,
  WorkflowNode,
  apiBase,
  authHeaders,
  jobWebUrl,
  launchTemplate,
  launchWorkflow,
  orderWorkflowNodes,
  surveySpecUrl,
  templateWebUrl,
  workflowJobWebUrl,
  workflowTemplateWebUrl,
} from "../common/awx";

export function WorkflowStagesList({ workflow }: { workflow: WorkflowJobTemplate }) {
  const { isLoading, data } = useFetch(
    `${apiBase()}/workflow_job_templates/${workflow.id}/workflow_nodes/?page_size=200`,
    {
      headers: authHeaders(),
      mapResult(result: Paginated<WorkflowNode>) {
        return { data: orderWorkflowNodes(result.results) };
      },
      onError(error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load stages", message: error.message });
      },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle={workflow.name} searchBarPlaceholder="Filter stages…">
      <List.EmptyView icon={Icon.Layers} title="No stages in this workflow" />
      {data?.map((node, index) => {
        const jt = node.summary_fields?.unified_job_template;
        if (!jt) return null;

        // Only job templates and workflows can be launched from here. Other node
        // kinds (approval, project sync, inventory sync, …) are shown read-only.
        const type = jt.unified_job_type ?? "";
        const isWorkflow = type === "workflow_job" || type === "workflow_job_template";
        const isJob = type === "job" || type === "job_template";

        if (!isWorkflow && !isJob) {
          return (
            <List.Item
              key={node.id}
              icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
              title={jt.name}
              accessories={[{ tag: `Stage ${index + 1}` }, { tag: stageTypeLabel(type) }]}
            />
          );
        }

        const launch = (extraVars?: string) =>
          isWorkflow ? launchWorkflow(jt.id, extraVars) : launchTemplate(jt.id, extraVars);
        const jobUrl = isWorkflow ? workflowJobWebUrl : jobWebUrl;
        const detailUrl = isWorkflow ? workflowTemplateWebUrl(jt.id) : templateWebUrl(jt.id);
        const surveyUrl = surveySpecUrl(isWorkflow ? "workflow_job_templates" : "job_templates", jt.id);

        return (
          <List.Item
            key={node.id}
            icon={{ source: isWorkflow ? Icon.Layers : Icon.Terminal, tintColor: Color.Purple }}
            title={jt.name}
            accessories={[{ tag: `Stage ${index + 1}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Launch Stage"
                    icon={Icon.Rocket}
                    onAction={() => confirmAndLaunch({ name: jt.name, launch: () => launch(), jobUrl })}
                  />
                  <Action.Push
                    title="Launch with Variables…"
                    icon={Icon.Pencil}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "return" },
                      Windows: { modifiers: ["ctrl"], key: "return" },
                    }}
                    target={<LaunchForm name={jt.name} launch={launch} jobUrl={jobUrl} surveyEndpoint={surveyUrl} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in AWX"
                    url={detailUrl}
                    icon={getFavicon(detailUrl, { fallback: Icon.Globe })}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/** Human-readable label for a non-launchable workflow node type. */
function stageTypeLabel(type: string): string {
  switch (type) {
    case "project_update":
      return "Project Sync";
    case "inventory_update":
      return "Inventory Sync";
    case "workflow_approval":
    case "workflow_approval_template":
      return "Approval";
    default:
      return type || "Unknown";
  }
}
