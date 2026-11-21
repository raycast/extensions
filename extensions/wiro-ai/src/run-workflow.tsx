import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { WorkflowForm } from "./components/workflow-form";
import { credentials } from "./lib/preferences";
import { listWorkflows } from "./lib/wiro";
import { fullSlugOf, workflowUrl } from "./lib/workflow";

const PAGE_SIZE = 30;
const WORKFLOWS_URL = "https://wiro.ai/panel/workflows";

export default function RunWorkflow() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, pagination } = useCachedPromise(
    (text: string) =>
      async ({ page }: { page: number }) => {
        const { workflows, total } = await listWorkflows(credentials(), {
          search: text,
          start: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        });
        return { data: workflows, hasMore: (page + 1) * PAGE_SIZE < total };
      },
    [search],
    { keepPreviousData: true },
  );
  const workflows = (data ?? []).filter((row) => fullSlugOf(row));
  // Read apart from isLoading, so a failed load still shows its reason.
  const loadError: Error | undefined = error;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search your workflows"
      pagination={pagination}
    >
      {!isLoading && workflows.length === 0 && loadError && (
        <List.EmptyView icon={Icon.Warning} title="Could not load your workflows" description={loadError.message} />
      )}
      {!isLoading && workflows.length === 0 && !loadError && (
        <List.EmptyView
          icon={Icon.Network}
          title={search ? "No workflows found" : "No workflows yet"}
          description="Build a workflow on wiro.ai, then run it from here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Workflows on Wiro AI" url={WORKFLOWS_URL} />
            </ActionPanel>
          }
        />
      )}
      {workflows.map((row) => {
        const fullSlug = fullSlugOf(row) ?? "";
        const title = typeof row.title === "string" && row.title.trim() ? row.title : fullSlug;
        const steps = Number(row.stepcount) || 0;
        const updated = Number(row.updatetime);
        return (
          <List.Item
            key={fullSlug}
            icon={Icon.Network}
            title={title}
            subtitle={typeof row.description === "string" ? row.description.slice(0, 80) : undefined}
            accessories={[
              ...(steps ? [{ text: `${steps} steps` }] : []),
              ...(Number.isFinite(updated) && updated > 0 ? [{ date: new Date(updated * 1000) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="Run Workflow" icon={Icon.Play} target={<WorkflowForm fullSlug={fullSlug} />} />
                <Action.OpenInBrowser title="Open Workflow Page" url={workflowUrl(fullSlug)} />
                <Action.CopyToClipboard
                  title="Copy Workflow Slug"
                  content={fullSlug}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
