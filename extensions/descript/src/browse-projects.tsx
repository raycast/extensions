import { useMemo, useRef, useState } from "react";

import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { renderAuthError } from "./lib/auth-ui";
import { descript, type ProjectSortField } from "./lib/client";
import { onLoadError } from "./lib/load-errors";
import { formatDateTime, formatDuration, relativeTime } from "./lib/format";
import {
  compositionCount,
  mediaFileCount,
  normalizeProject,
  projectUrlFromId,
  totalCompositionDuration,
  totalMediaDuration,
  type NormalizedProject,
} from "./lib/projects";
import { useProjectDetail } from "./lib/use-project-detail";
import type { DescriptProject } from "./lib/types";
import ProjectContents from "./project-contents";
import PublishCompositionForm from "./publish-composition";
import RunUnderlordPromptForm from "./run-underlord-prompt";

const SORT_OPTIONS: Array<{ id: ProjectSortField; label: string }> = [
  { id: "updated_at", label: "Recently updated" },
  { id: "created_at", label: "Recently created" },
  { id: "last_viewed_at", label: "Recently viewed" },
  { id: "name", label: "Name (A–Z)" },
];

const PROJECTS_PAGE_SIZE = 50;

export default function BrowseProjects() {
  const [sort, setSort] = useState<ProjectSortField>("updated_at");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // Cursor pagination: `cursorsRef[N]` is the cursor for page N (page 0 is undefined).
  const cursorsRef = useRef<(string | undefined)[]>([undefined]);

  const { data, isLoading, error, revalidate, pagination } = useCachedPromise(
    (sortField: ProjectSortField, search: string) =>
      async ({ page }: { page: number }) => {
        if (page === 0) cursorsRef.current = [undefined];

        const cursor = cursorsRef.current[page];
        if (page > 0 && !cursor) {
          return { data: [], hasMore: false };
        }

        const response = await descript.listProjects({
          limit: PROJECTS_PAGE_SIZE,
          cursor,
          name: search.trim() || undefined,
          sort: sortField,
          direction: "desc",
        });

        cursorsRef.current[page + 1] = response.cursor ?? undefined;
        return {
          data: response.projects ?? [],
          hasMore: Boolean(response.cursor),
        };
      },
    [sort, searchText],
    {
      keepPreviousData: true,
      onError: onLoadError("Could not load projects"),
    },
  );

  const projects = useMemo<NormalizedProject[]>(
    () => (data ?? []).map(normalizeProject).filter((entry) => entry.id),
    [data],
  );

  const focusedDetail = useProjectDetail(selectedId);

  const authError = renderAuthError(error, revalidate);
  if (authError) return authError;

  return (
    <List
      isLoading={isLoading || focusedDetail.isLoading}
      isShowingDetail
      pagination={pagination}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder="Search projects by name…"
      // Server-side search: the API filters by name so results aren't limited
      // to the pages loaded so far. Disable Raycast's client-side filtering.
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Sort by" value={sort} onChange={(value) => setSort(value as ProjectSortField)}>
          {SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.id} value={option.id} title={option.label} />
          ))}
        </List.Dropdown>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText.trim() ? "No matching projects" : "No projects yet"}
          description={
            searchText.trim()
              ? "No project name matches your search."
              : "Import media to create your first Descript project."
          }
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => {
          const isSelected = selectedId === project.id;
          return (
            <ProjectRow
              key={project.id}
              project={project}
              isSelected={isSelected}
              focusedDetail={isSelected ? focusedDetail.detail : null}
              isFocusedLoading={isSelected ? focusedDetail.isLoading : false}
              focusedError={isSelected ? focusedDetail.error : null}
              onReload={revalidate}
            />
          );
        })
      )}
    </List>
  );
}

type ProjectRowProps = {
  project: NormalizedProject;
  isSelected: boolean;
  focusedDetail: DescriptProject | null;
  isFocusedLoading: boolean;
  focusedError: Error | null;
  onReload: () => void;
};

function ProjectRow({ project, isSelected, focusedDetail, isFocusedLoading, focusedError, onReload }: ProjectRowProps) {
  const merged: NormalizedProject = useMemo(() => {
    if (!isSelected || !focusedDetail) return project;
    const fresh = normalizeProject(focusedDetail as DescriptProject & Record<string, unknown>);
    return {
      ...project,
      ...fresh,
      id: project.id,
      name: fresh.name || project.name,
    };
  }, [project, isSelected, focusedDetail]);

  return (
    <List.Item
      id={project.id}
      icon={{ source: Icon.Document, tintColor: Color.Blue }}
      title={project.name}
      subtitle={project.folderPath}
      detail={
        <ProjectDetailPane
          project={merged}
          error={focusedError}
          showRich={isSelected && (focusedDetail !== null || isFocusedLoading)}
        />
      }
      actions={<ProjectActions project={merged} onReload={onReload} />}
    />
  );
}

function ProjectDetailPane({
  project,
  error,
  showRich,
}: {
  project: NormalizedProject;
  error: Error | null;
  showRich: boolean;
}) {
  if (!showRich) {
    return <List.Item.Detail markdown={`# ${project.name}`} />;
  }

  const compCount = compositionCount(project.compositions);
  const mediaCount = mediaFileCount(project.mediaFiles);
  const totalMedia = totalMediaDuration(project.mediaFiles);
  const totalComp = totalCompositionDuration(project.compositions);
  const url = projectUrlFromId(project);
  const hasDetail = Array.isArray(project.compositions) || Boolean(project.mediaFiles);
  const hasTimestamps = Boolean(project.createdAt || project.updatedAt || project.driveId);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
          {project.folderPath ? (
            <List.Item.Detail.Metadata.Label title="Folder" text={project.folderPath} icon={Icon.Folder} />
          ) : null}
          {hasDetail ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Compositions"
                text={String(compCount)}
                icon={{ source: Icon.Layers, tintColor: Color.Purple }}
              />
              <List.Item.Detail.Metadata.Label
                title="Media files"
                text={String(mediaCount)}
                icon={{ source: Icon.Paperclip, tintColor: Color.Blue }}
              />
              {totalComp !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Composition length"
                  text={formatDuration(totalComp) ?? "—"}
                  icon={Icon.Clock}
                />
              ) : null}
              {totalMedia !== undefined ? (
                <List.Item.Detail.Metadata.Label
                  title="Source media length"
                  text={formatDuration(totalMedia) ?? "—"}
                  icon={Icon.Clock}
                />
              ) : null}
            </>
          ) : error ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Compositions & media"
                text="Couldn't load details"
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              />
            </>
          ) : null}
          {hasTimestamps ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              {project.createdAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={`${formatDateTime(project.createdAt) ?? project.createdAt}${
                    relativeTime(project.createdAt) ? ` · ${relativeTime(project.createdAt)}` : ""
                  }`}
                />
              ) : null}
              {project.updatedAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Updated"
                  text={`${formatDateTime(project.updatedAt) ?? project.updatedAt}${
                    relativeTime(project.updatedAt) ? ` · ${relativeTime(project.updatedAt)}` : ""
                  }`}
                />
              ) : null}
              {project.driveId ? <List.Item.Detail.Metadata.Label title="Drive" text={project.driveId} /> : null}
            </>
          ) : null}
          {url ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Open in Descript" target={url} text="Web app" />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ProjectActions({ project, onReload }: { project: NormalizedProject; onReload: () => void }) {
  const url = projectUrlFromId(project);
  return (
    <ActionPanel>
      <Action.Push title="Show Contents…" icon={Icon.Sidebar} target={<ProjectContents project={project} />} />
      {url ? <Action.OpenInBrowser url={url} title="Open Project in Descript" icon={Icon.Pencil} /> : null}
      <Action.Push
        title="Run Underlord Prompt…"
        icon={Icon.Wand}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<RunUnderlordPromptForm presetProjectId={project.id} presetProjectName={project.name} />}
      />
      <Action.Push
        title="Publish Composition…"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        target={
          <PublishCompositionForm
            projectId={project.id}
            projectName={project.name}
            compositions={project.compositions}
          />
        }
      />
      {url ? (
        <Action.CopyToClipboard title="Copy Project URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Project ID"
        content={project.id}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onReload}
      />
    </ActionPanel>
  );
}
