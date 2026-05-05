import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { loadBrainstorms } from "./brainstorm-data";
import { Brainstorm } from "./brainstorm-types";
import { BrainstormActions } from "./components/brainstorm-actions";
import { BrainstormForm } from "./components/brainstorm-form";
import { loadHydratedProjectCache } from "./project-records";
import { loadStorageState } from "./storage";

export default function Command() {
  const { push } = useNavigation();
  const [brainstorms, setBrainstorms] = useState<Brainstorm[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const refresh = useCallback(() => {
    setBrainstorms(loadBrainstorms());
  }, []);

  useEffect(() => {
    refresh();
    void (async () => {
      try {
        const storageState = await loadStorageState();
        const projects = await loadHydratedProjectCache(storageState);
        const map: Record<string, string> = {};
        for (const p of projects) {
          map[p.path] = p.displayName ?? p.directoryName;
        }
        setProjectsMap(map);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refresh]);

  function handleCreateNew(projectPath?: string) {
    push(<BrainstormForm defaultProjectPath={projectPath} onSave={refresh} />);
  }

  // Group brainstorms by projectPath, sorted within each group by updatedAt desc
  const groups = buildGroups(brainstorms, projectsMap);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search brainstorms by title or content"
    >
      <List.EmptyView
        title={brainstorms.length === 0 ? "No brainstorms yet" : "No matching brainstorms"}
        description={brainstorms.length === 0 ? "Press ⌘N to capture your first idea" : "Try a different search term"}
        icon={brainstorms.length === 0 ? Icon.LightBulb : Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              title="New Brainstorm"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => handleCreateNew()}
            />
          </ActionPanel>
        }
      />
      {groups.map(({ key, title, items }) => (
        <List.Section key={key} title={title} subtitle={String(items.length)}>
          {items.map((brainstorm) => (
            <BrainstormListItem
              key={brainstorm.id}
              brainstorm={brainstorm}
              projectName={brainstorm.projectPath ? projectsMap[brainstorm.projectPath] : undefined}
              isShowingDetail={isShowingDetail}
              onRefresh={refresh}
              onCreateNew={handleCreateNew}
              onToggleDetail={() => setIsShowingDetail((v) => !v)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface BrainstormGroup {
  key: string;
  title: string;
  latestUpdatedAt: string;
  items: Brainstorm[];
}

function buildGroups(brainstorms: Brainstorm[], projectsMap: Record<string, string>): BrainstormGroup[] {
  const map = new Map<string, BrainstormGroup>();

  for (const b of brainstorms) {
    const key = b.projectPath ?? "__none__";
    if (!map.has(key)) {
      const title = b.projectPath ? (projectsMap[b.projectPath] ?? b.projectPath) : "No Project";
      map.set(key, { key, title, latestUpdatedAt: b.updatedAt, items: [] });
    }
    const group = map.get(key)!;
    group.items.push(b);
    if (b.updatedAt > group.latestUpdatedAt) group.latestUpdatedAt = b.updatedAt;
  }

  // Sort items within each group newest first
  for (const group of map.values()) {
    group.items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  // Sort groups by their latest brainstorm, "No Project" last
  return [...map.values()].sort((a, b) => {
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    return b.latestUpdatedAt.localeCompare(a.latestUpdatedAt);
  });
}

interface BrainstormListItemProps {
  brainstorm: Brainstorm;
  projectName?: string;
  isShowingDetail: boolean;
  onRefresh: () => void;
  onCreateNew: (projectPath?: string) => void;
  onToggleDetail: () => void;
}

function BrainstormListItem({
  brainstorm,
  projectName,
  isShowingDetail,
  onRefresh,
  onCreateNew,
  onToggleDetail,
}: BrainstormListItemProps) {
  const accessories: List.Item.Accessory[] = isShowingDetail
    ? []
    : [
        ...(projectName ? [{ text: { value: projectName, color: Color.SecondaryText } }] : []),
        { text: { value: formatRelativeDate(brainstorm.updatedAt), color: Color.SecondaryText } },
      ];

  const keywords = [brainstorm.title, projectName ?? "", brainstorm.content.slice(0, 200)].filter(Boolean);

  return (
    <List.Item
      id={brainstorm.id}
      icon={Icon.LightBulb}
      title={brainstorm.title}
      accessories={accessories}
      keywords={keywords}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            markdown={buildDetailMarkdown(brainstorm)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Title" text={brainstorm.title} />
                {projectName ? (
                  <List.Item.Detail.Metadata.Label title="Project" text={projectName} icon={Icon.Folder} />
                ) : null}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Created" text={formatAbsoluteDate(brainstorm.createdAt)} />
                <List.Item.Detail.Metadata.Label title="Updated" text={formatAbsoluteDate(brainstorm.updatedAt)} />
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <BrainstormActions
          brainstorm={brainstorm}
          projectName={projectName}
          onRefresh={onRefresh}
          onCreateNew={onCreateNew}
          onToggleDetail={onToggleDetail}
        />
      }
    />
  );
}

function buildDetailMarkdown(brainstorm: Brainstorm): string {
  const lines: string[] = [`# ${brainstorm.title}`];
  if (brainstorm.content.trim()) {
    lines.push("", brainstorm.content);
  } else {
    lines.push("", "*No content yet.*");
  }
  return lines.join("\n");
}

function formatRelativeDate(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatAbsoluteDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
