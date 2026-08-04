import { useMemo } from "react";

import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { descript } from "./lib/client";
import { onLoadError } from "./lib/load-errors";
import { formatDuration } from "./lib/format";
import {
  compositionUrl as buildCompositionUrl,
  normalizeProject,
  projectUrlFromId,
  type NormalizedProject,
} from "./lib/projects";
import PublishCompositionForm from "./publish-composition";
import RunUnderlordPromptForm from "./run-underlord-prompt";
import type { DescriptComposition, DescriptMediaFile, DescriptProject } from "./lib/types";

type Props = {
  project: NormalizedProject;
};

type CompositionRow = {
  kind: "composition";
  id: string;
  name: string;
  mediaType: string;
  duration?: number;
};

type MediaRow = {
  kind: "media";
  path: string;
  type: string;
  duration?: number;
};

type SectionDef<T> = {
  key: string;
  title: string;
  icon: { source: Icon; tintColor: Color };
  items: T[];
};

export default function ProjectContents({ project }: Props) {
  const [showDetail, setShowDetail] = useCachedState("project-contents:show-detail", true);

  const { data: detail, isLoading } = useCachedPromise(async (id: string) => descript.getProject(id), [project.id], {
    keepPreviousData: true,
    onError: onLoadError("Could not load project detail"),
  });

  const merged: NormalizedProject = useMemo(() => {
    if (!detail) return project;
    const fresh = normalizeProject(detail as DescriptProject & Record<string, unknown>);
    return { ...project, ...fresh, id: project.id, name: fresh.name || project.name };
  }, [project, detail]);

  const projectUrl = projectUrlFromId(merged);

  const compositionSections = useMemo(() => bucketCompositions(merged.compositions ?? []), [merged.compositions]);
  const mediaSections = useMemo(() => bucketMedia(merged.mediaFiles ?? {}), [merged.mediaFiles]);

  const isEmpty =
    !isLoading &&
    compositionSections.every((s) => s.items.length === 0) &&
    mediaSections.every((s) => s.items.length === 0);

  const projectPublishAction = (
    <Action.Push
      title="Publish Composition…"
      icon={Icon.Globe}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      target={
        <PublishCompositionForm projectId={merged.id} projectName={merged.name} compositions={merged.compositions} />
      }
    />
  );

  const sharedActions = (
    <>
      <Action
        title={showDetail ? "Hide Detail" : "Show Detail"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowDetail((value) => !value)}
      />
      {projectUrl ? (
        <Action.OpenInBrowser url={projectUrl} title="Open Project in Descript" icon={Icon.Pencil} />
      ) : null}
      <Action.Push
        title="Run Underlord Prompt…"
        icon={Icon.Wand}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<RunUnderlordPromptForm presetProjectId={merged.id} presetProjectName={merged.name} />}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={merged.name}
      searchBarPlaceholder="Filter compositions and media…"
    >
      {isEmpty ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Nothing in this project yet"
          description="Import media or open the project in Descript to add compositions."
          actions={
            <ActionPanel>
              {projectUrl ? (
                <Action.OpenInBrowser url={projectUrl} title="Open Project in Descript" icon={Icon.Pencil} />
              ) : null}
              {projectPublishAction}
            </ActionPanel>
          }
        />
      ) : null}

      {compositionSections.map((section) =>
        section.items.length === 0 ? null : (
          <List.Section key={section.key} title={section.title} subtitle={String(section.items.length)}>
            {section.items.map((row) => (
              <CompositionItem
                key={row.id}
                row={row}
                project={merged}
                projectUrl={projectUrl}
                showDetail={showDetail}
                sharedActions={sharedActions}
              />
            ))}
          </List.Section>
        ),
      )}

      {mediaSections.map((section) =>
        section.items.length === 0 ? null : (
          <List.Section key={section.key} title={section.title} subtitle={String(section.items.length)}>
            {section.items.map((row) => (
              <MediaItem
                key={row.path}
                row={row}
                project={merged}
                projectUrl={projectUrl}
                showDetail={showDetail}
                sharedActions={sharedActions}
                projectPublishAction={projectPublishAction}
              />
            ))}
          </List.Section>
        ),
      )}
    </List>
  );
}

function CompositionItem({
  row,
  project,
  projectUrl,
  showDetail,
  sharedActions,
}: {
  row: CompositionRow;
  project: NormalizedProject;
  projectUrl?: string;
  showDetail: boolean;
  sharedActions: React.ReactNode;
}) {
  const icon = compositionIcon(row.mediaType);
  const duration = formatDuration(row.duration);
  const compUrl = buildCompositionUrl(project, { id: row.id });

  const accessories: List.Item.Accessory[] = showDetail
    ? []
    : [
        ...(duration ? [{ icon: Icon.Clock, text: duration, tooltip: "Composition duration" }] : []),
        { tag: { value: row.mediaType || "unknown", color: icon.tintColor } },
      ];

  return (
    <List.Item
      icon={icon}
      title={row.name}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={row.name} />
              <List.Item.Detail.Metadata.Label title="Type" icon={icon} text={row.mediaType || "unknown"} />
              {duration ? <List.Item.Detail.Metadata.Label title="Duration" text={duration} /> : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Composition ID" text={row.id} />
              <List.Item.Detail.Metadata.Label title="Project" text={project.name} />
              {compUrl ? (
                <List.Item.Detail.Metadata.Link title="Open Composition" target={compUrl} text="In Descript web app" />
              ) : projectUrl ? (
                <List.Item.Detail.Metadata.Link title="Open Project" target={projectUrl} text="In Descript web app" />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {compUrl ? (
            <Action.OpenInBrowser url={compUrl} title="Open Composition in Descript" icon={Icon.Globe} />
          ) : null}
          <Action.Push
            title="Publish This Composition…"
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            target={
              <PublishCompositionForm
                projectId={project.id}
                projectName={project.name}
                presetCompositionId={row.id}
                compositions={project.compositions}
              />
            }
          />
          {projectUrl ? (
            <Action.OpenInBrowser
              url={projectUrl}
              title="Open Project in Descript"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          ) : null}
          {compUrl ? (
            <Action.CopyToClipboard
              title="Copy Composition URL"
              content={compUrl}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Composition ID"
            content={row.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="Copy Composition Name"
            content={row.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {sharedActions}
        </ActionPanel>
      }
    />
  );
}

function MediaItem({
  row,
  project,
  projectUrl,
  showDetail,
  sharedActions,
  projectPublishAction,
}: {
  row: MediaRow;
  project: NormalizedProject;
  projectUrl?: string;
  showDetail: boolean;
  sharedActions: React.ReactNode;
  projectPublishAction: React.ReactNode;
}) {
  const icon = mediaIcon(row.type);
  const duration = formatDuration(row.duration);
  const fileName = row.path.split("/").pop() || row.path;

  const accessories: List.Item.Accessory[] = showDetail
    ? []
    : [
        ...(duration ? [{ icon: Icon.Clock, text: duration, tooltip: "Media duration" }] : []),
        { tag: { value: row.type || "file", color: icon.tintColor } },
      ];

  return (
    <List.Item
      icon={icon}
      title={fileName}
      subtitle={showDetail ? undefined : row.path}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="File" text={fileName} />
              <List.Item.Detail.Metadata.Label title="Path" text={row.path} icon={Icon.Folder} />
              <List.Item.Detail.Metadata.Label title="Type" icon={icon} text={row.type || "file"} />
              {duration ? <List.Item.Detail.Metadata.Label title="Duration" text={duration} /> : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Project" text={project.name} />
              {projectUrl ? (
                <List.Item.Detail.Metadata.Link title="Open Project" target={projectUrl} text="In Descript web app" />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {projectUrl ? (
            <Action.OpenInBrowser url={projectUrl} title="Open Project in Descript" icon={Icon.Globe} />
          ) : null}
          <Action.CopyToClipboard
            title="Copy File Path"
            content={row.path}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy File Name" content={fileName} shortcut={Keyboard.Shortcut.Common.Copy} />
          {projectPublishAction}
          {sharedActions}
        </ActionPanel>
      }
    />
  );
}

function bucketCompositions(comps: DescriptComposition[]): SectionDef<CompositionRow>[] {
  const sections: SectionDef<CompositionRow>[] = [
    { key: "comp-video", title: "Video compositions", icon: { source: Icon.Video, tintColor: Color.Blue }, items: [] },
    {
      key: "comp-audio",
      title: "Audio compositions",
      icon: { source: Icon.SpeechBubble, tintColor: Color.Orange },
      items: [],
    },
    {
      key: "comp-other",
      title: "Other compositions",
      icon: { source: Icon.Layers, tintColor: Color.SecondaryText },
      items: [],
    },
  ];

  for (const comp of comps) {
    const row: CompositionRow = {
      kind: "composition",
      id: comp.id,
      name: comp.name || comp.id,
      mediaType: (comp.media_type ?? "").toLowerCase(),
      duration: comp.duration,
    };
    if (row.mediaType === "video") sections[0].items.push(row);
    else if (row.mediaType === "audio") sections[1].items.push(row);
    else sections[2].items.push(row);
  }

  for (const section of sections) {
    section.items.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sections;
}

function bucketMedia(files: Record<string, DescriptMediaFile>): SectionDef<MediaRow>[] {
  const sections: SectionDef<MediaRow>[] = [
    { key: "media-video", title: "Video files", icon: { source: Icon.Video, tintColor: Color.Blue }, items: [] },
    {
      key: "media-audio",
      title: "Audio files",
      icon: { source: Icon.SpeechBubble, tintColor: Color.Orange },
      items: [],
    },
    { key: "media-image", title: "Images", icon: { source: Icon.Image, tintColor: Color.Green }, items: [] },
    {
      key: "media-other",
      title: "Other files",
      icon: { source: Icon.Document, tintColor: Color.SecondaryText },
      items: [],
    },
  ];

  for (const [path, meta] of Object.entries(files)) {
    const type = (meta?.type ?? "").toLowerCase();
    const row: MediaRow = { kind: "media", path, type, duration: meta?.duration };
    if (type === "video") sections[0].items.push(row);
    else if (type === "audio") sections[1].items.push(row);
    else if (type === "image") sections[2].items.push(row);
    else sections[3].items.push(row);
  }

  for (const section of sections) {
    section.items.sort((a, b) => a.path.localeCompare(b.path));
  }
  return sections;
}

function compositionIcon(mediaType: string): { source: Icon; tintColor: Color } {
  switch (mediaType) {
    case "video":
      return { source: Icon.Video, tintColor: Color.Blue };
    case "audio":
      return { source: Icon.SpeechBubble, tintColor: Color.Orange };
    default:
      return { source: Icon.Layers, tintColor: Color.SecondaryText };
  }
}

function mediaIcon(type: string): { source: Icon; tintColor: Color } {
  switch (type) {
    case "video":
      return { source: Icon.Video, tintColor: Color.Blue };
    case "audio":
      return { source: Icon.SpeechBubble, tintColor: Color.Orange };
    case "image":
      return { source: Icon.Image, tintColor: Color.Green };
    case "transcript":
    case "text":
      return { source: Icon.Document, tintColor: Color.Yellow };
    default:
      return { source: Icon.Paperclip, tintColor: Color.SecondaryText };
  }
}
