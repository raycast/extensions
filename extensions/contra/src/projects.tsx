import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  ActiveProject,
  ALL_INVOICE_STATUSES,
  deriveProjects,
  formatDate,
  formatUSD,
  listAllInvoicesSent,
} from "./lib/contra";

const STATUS_TINT: Record<string, Color> = {
  IN_PROGRESS: Color.Green,
  COMPLETED: Color.SecondaryText,
  CANCELLED: Color.Red,
};

const INITIAL_PAGES = 2;
const MAX_PAGES = 8;

export default function Command() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [maxPages, setMaxPages] = useState(INITIAL_PAGES);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (pages: number) =>
      deriveProjects(await listAllInvoicesSent(ALL_INVOICE_STATUSES, pages)),
    [maxPages],
    {
      onError: (e) => {
        showFailureToast(e, { title: "Failed to load projects" });
      },
    },
  );

  const projects = data ?? [];
  const active = projects.filter((p) => p.status === "IN_PROGRESS");
  const completed = projects.filter((p) => p.status !== "IN_PROGRESS");
  const canLoadMore = maxPages < MAX_PAGES;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Projects"
      searchBarPlaceholder="Filter projects…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          onChange={(v) => setShowCompleted(v === "all")}
          storeValue
        >
          <List.Dropdown.Item title="Active only" value="active" />
          <List.Dropdown.Item title="All projects" value="all" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          {canLoadMore && (
            <Action
              title="Load More Projects"
              icon={Icon.Download}
              onAction={() => setMaxPages((p) => Math.min(p + 2, MAX_PAGES))}
            />
          )}
        </ActionPanel>
      }
    >
      <List.Section title="Active" subtitle={`${active.length}`}>
        {active.map((p) => (
          <ProjectItem key={p.id} project={p} />
        ))}
      </List.Section>

      {showCompleted && (
        <List.Section
          title="Completed / Other"
          subtitle={`${completed.length}`}
        >
          {completed.map((p) => (
            <ProjectItem key={p.id} project={p} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ProjectItem({ project }: { project: ActiveProject }) {
  return (
    <List.Item
      icon={{
        source: Icon.Folder,
        tintColor: STATUS_TINT[project.status] ?? Color.Purple,
      }}
      title={project.title}
      subtitle={project.clientName ?? undefined}
      accessories={[
        {
          tag: {
            value: project.status.replaceAll("_", " "),
            color: STATUS_TINT[project.status] ?? Color.Purple,
          },
        },
        {
          text: formatUSD(project.totalInvoiced),
          tooltip: `${project.invoiceCount} invoice(s)`,
        },
        {
          date: project.lastActivity
            ? new Date(project.lastActivity)
            : undefined,
          tooltip: `Last invoice ${formatDate(project.lastActivity)}`,
        },
      ]}
      actions={
        <ActionPanel>
          {project.lastInvoiceUrl && (
            <Action.OpenInBrowser
              url={project.lastInvoiceUrl}
              title="Open Latest Invoice"
            />
          )}
          <Action.CopyToClipboard
            title="Copy Project Title"
            content={project.title}
          />
        </ActionPanel>
      }
    />
  );
}
