import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import nodePath from "node:path";
import { pathToFileURL } from "node:url";
import {
  getCodexHome,
  type CodexThread,
  readThreads,
} from "./utils/app-server";
import {
  type CodexDesktopProject,
  type CodexProjectSortOrder,
  isCodexProjectSortOrder,
  loadCodexDesktopProjects,
  sortCodexDesktopProjects,
} from "./utils/desktop-projects";
import {
  getBranchSubtitle,
  getStatusAccessory,
  getThreadIconAccessory,
  getUpdatedAtAccessory,
} from "./utils/display";
import {
  formatCompactTimestampSeconds,
  formatCount,
  getThreadDisplayTitle,
  tildeifyPath,
} from "./utils/format";
import { openCodexProject, openNewCodexThread } from "./utils/launch";
import {
  revalidateWithToast,
  runNoViewActionWithFailureToast,
} from "./utils/raycast";
import { ThreadRowActions, ToggleDetailAction } from "./thread-actions";

export default function ManageCodexProjectsCommand() {
  const [sortOrder, setSortOrder] = useCachedState<CodexProjectSortOrder>(
    "codex-projects-sort-order",
    "default",
  );
  const [isShowingDetail, setIsShowingDetail] = useCachedState(
    "codex-projects-show-detail",
    false,
  );
  const { data, error, isLoading, revalidate } = usePromise(loadProjects, [], {
    failureToastOptions: { title: "Couldn't load Codex Projects" },
  });
  const projects = sortCodexDesktopProjects(data ?? [], sortOrder);
  const sections = [
    {
      title: "Pinned",
      projects: projects.filter((project) => project.isPinned),
    },
    {
      title: "Projects",
      projects: projects.filter((project) => !project.isPinned),
    },
  ].filter((section) => section.projects.length > 0);
  const toggleDetails = () => setIsShowingDetail(!isShowingDetail);

  const refreshProjects = () =>
    revalidateWithToast(revalidate, {
      successTitle: "Projects Refreshed",
      failureTitle: "Couldn't refresh Codex projects",
    });

  if (!data && error) {
    return (
      <LoadErrorDetail
        title="Couldn't Load Codex Projects"
        error={error}
        onRetry={refreshProjects}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search Codex Projects"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Projects"
          value={sortOrder}
          onChange={(value) => {
            if (isCodexProjectSortOrder(value)) {
              setSortOrder(value);
            }
          }}
        >
          <List.Dropdown.Section title="Sort by…">
            {projectSortOptions.map((option) => (
              <List.Dropdown.Item
                key={option.value}
                title={option.title}
                value={option.value}
                icon={{ source: option.icon, tintColor: option.color }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={String(section.projects.length)}
        >
          {section.projects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              onRefresh={refreshProjects}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetails}
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && projects.length === 0 ? (
        <List.EmptyView
          title="No Codex Projects"
          description="Projects you create in the Codex desktop app will appear here."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Projects"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshProjects}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

async function loadProjects(): Promise<CodexDesktopProject[]> {
  return loadCodexDesktopProjects(await getCodexHome());
}

function LoadErrorDetail({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error;
  onRetry: () => Promise<void>;
}) {
  return (
    <Detail
      markdown={`# ${title}\n\n${error.message}`}
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRetry}
          />
        </ActionPanel>
      }
    />
  );
}

function ProjectListItem({
  project,
  onRefresh,
  isShowingDetail,
  onToggleDetail,
}: {
  project: CodexDesktopProject;
  onRefresh: () => Promise<void>;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const primaryRoot = project.roots[0];
  const unavailableRootCount = countUnavailableRoots(project);

  return (
    <List.Item
      id={project.id}
      title={{ value: project.name, tooltip: project.name }}
      icon={
        primaryRoot?.isAvailable ? { fileIcon: primaryRoot.path } : Icon.Folder
      }
      keywords={[
        project.name,
        ...project.roots.flatMap((root) => [
          root.path,
          tildeifyPath(root.path),
          nodePath.basename(root.path),
        ]),
      ]}
      accessories={
        isShowingDetail
          ? []
          : [
              {
                icon: Icon.Message,
                text: formatCount(project.threadIds.length, "thread"),
                tooltip: `${formatCount(project.threadIds.length, "thread")} in project`,
              },
              {
                icon: Icon.Folder,
                text: formatCount(project.roots.length, "folder"),
                tooltip: formatCount(project.roots.length, "attached folder"),
              },
              ...(unavailableRootCount > 0
                ? [
                    {
                      icon: Icon.Warning,
                      tooltip: formatCount(
                        unavailableRootCount,
                        "unavailable folder",
                      ),
                    },
                  ]
                : []),
            ]
      }
      detail={
        isShowingDetail ? (
          <ProjectListDetail
            project={project}
            unavailableRootCount={unavailableRootCount}
          />
        ) : undefined
      }
      actions={
        <ProjectActions
          project={project}
          onRefresh={onRefresh}
          isShowingDetail={isShowingDetail}
          onToggleDetail={onToggleDetail}
        />
      }
    />
  );
}

function ProjectActions({
  project,
  onRefresh,
  isShowingDetail,
  onToggleDetail,
}: {
  project: CodexDesktopProject;
  onRefresh: () => Promise<void>;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const primaryRoot = project.roots[0];
  const attachedFinderRoots = project.roots
    .map((root, index) => ({ ...root, index }))
    .filter((root) => root.isAvailable && root.path !== primaryRoot?.path);

  return (
    <ActionPanel>
      <Action.Push
        title="View Threads"
        icon={Icon.Message}
        target={<ProjectThreads project={project} />}
      />
      <Action
        title="Open in Desktop"
        icon={Icon.AppWindow}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() =>
          runNoViewActionWithFailureToast(
            "Unable to open project in desktop app",
            () => openCodexProject(project.id),
          )
        }
      />
      {primaryRoot?.isAvailable ? (
        <Action
          title="New Thread in Project"
          icon={Icon.PlusCircle}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() =>
            runNoViewActionWithFailureToast(
              "Unable to start thread in Codex",
              () => openNewCodexThread({ path: primaryRoot.path }),
            )
          }
        />
      ) : null}
      <ToggleDetailAction
        isShowingDetail={isShowingDetail}
        onToggleDetail={onToggleDetail}
      />
      <Action
        title="Refresh Projects"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />

      {primaryRoot?.isAvailable ? (
        <Action.ShowInFinder
          title="Open in Finder"
          path={primaryRoot.path}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        />
      ) : null}
      {attachedFinderRoots.length > 0 ? (
        <ActionPanel.Submenu
          title="Open Attached Folder in Finder"
          icon={Icon.Paperclip}
        >
          {attachedFinderRoots.map((root) => (
            <Action.ShowInFinder
              key={root.path}
              title={getRootActionLabel(root.path, root.index)}
              path={root.path}
            />
          ))}
        </ActionPanel.Submenu>
      ) : null}
      {primaryRoot ? (
        <Action.CopyToClipboard
          title="Copy Path"
          content={primaryRoot.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      ) : null}
      {project.roots.length > 1 ? (
        <Action.CopyToClipboard
          title="Copy All Paths"
          content={project.roots.map((root) => root.path).join("\n")}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}
    </ActionPanel>
  );
}

function ProjectListDetail({
  project,
  unavailableRootCount,
}: {
  project: CodexDesktopProject;
  unavailableRootCount: number;
}) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {project.roots.length > 0 ? (
            project.roots.map((root, index) =>
              root.isAvailable ? (
                <List.Item.Detail.Metadata.Link
                  key={`${root.path}-${index}`}
                  title={getRootRoleLabel(index)}
                  target={pathToFileURL(root.path).href}
                  text={tildeifyPath(root.path)}
                />
              ) : (
                <List.Item.Detail.Metadata.Label
                  key={`${root.path}-${index}`}
                  title={getRootRoleLabel(index)}
                  icon={{ source: Icon.Warning, tintColor: Color.Red }}
                  text={{
                    value: `${tildeifyPath(root.path)} (Unavailable)`,
                    color: Color.Red,
                  }}
                />
              ),
            )
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Folders"
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              text={{
                value: "No folders attached",
                color: Color.SecondaryText,
              }}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Contents">
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Message}
              text={formatCount(project.threadIds.length, "Thread")}
              color={Color.Blue}
            />
            <List.Item.Detail.Metadata.TagList.Item
              icon={Icon.Folder}
              text={formatCount(project.roots.length, "Folder")}
              color={Color.Orange}
            />
            {unavailableRootCount > 0 ? (
              <List.Item.Detail.Metadata.TagList.Item
                icon={Icon.Warning}
                text={formatCount(unavailableRootCount, "Unavailable Folder")}
                color={Color.Red}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Updated"
            icon={Icon.Calendar}
            text={{
              value: formatCompactTimestampSeconds(project.updatedAt),
              color: Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Created"
            icon={Icon.Calendar}
            text={{
              value: formatCompactTimestampSeconds(project.createdAt),
              color: Color.SecondaryText,
            }}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

async function loadProjectThreads(projectId: string) {
  const project = (await loadProjects()).find(
    (candidate) => candidate.id === projectId,
  );
  if (!project) throw new Error("This Codex project no longer exists.");
  return readThreads(project.threadIds);
}

function ProjectThreads({ project }: { project: CodexDesktopProject }) {
  const { data, error, isLoading, revalidate } = usePromise(
    loadProjectThreads,
    [project.id],
    {
      failureToastOptions: {
        title: `Couldn't load ${project.name} threads`,
      },
    },
  );
  const threads = data?.threads ?? [];
  const unavailableCount = data?.unavailableThreadIds.length ?? 0;

  const refreshThreads = () =>
    revalidateWithToast(revalidate, {
      successTitle: "Threads Refreshed",
      failureTitle: `Couldn't refresh ${project.name} threads`,
    });

  if (!data && error) {
    return (
      <LoadErrorDetail
        title="Couldn't Load Project Threads"
        error={error}
        onRetry={refreshThreads}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={project.name}
      searchBarPlaceholder={`Search ${project.name} threads`}
    >
      {threads.length > 0 ? (
        <List.Section
          title="Threads"
          subtitle={getThreadSectionSubtitle(threads.length, unavailableCount)}
        >
          {threads.map((thread) => (
            <ProjectThreadItem
              key={thread.id}
              thread={thread}
              onRefresh={refreshThreads}
            />
          ))}
        </List.Section>
      ) : null}
      {!isLoading && threads.length === 0 ? (
        <List.EmptyView
          title={unavailableCount > 0 ? "No Available Threads" : "No Threads"}
          description={
            unavailableCount > 0
              ? "This project's threads were deleted or their history is gone."
              : "Threads assigned to this project will appear here."
          }
          icon={unavailableCount > 0 ? Icon.Warning : Icon.Message}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Threads"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshThreads}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function ProjectThreadItem({
  thread,
  onRefresh,
}: {
  thread: CodexThread;
  onRefresh: () => Promise<void>;
}) {
  const displayTitle = getThreadDisplayTitle(thread);

  return (
    <List.Item
      id={thread.id}
      title={{ value: displayTitle, tooltip: displayTitle }}
      subtitle={getBranchSubtitle(thread)}
      icon={getThreadIconAccessory(thread)}
      keywords={[thread.id, thread.cwd, thread.gitInfo?.branch ?? ""]}
      accessories={[
        getStatusAccessory(thread),
        getUpdatedAtAccessory(thread),
      ].filter((accessory) => accessory !== undefined)}
      actions={
        <ThreadRowActions
          thread={thread}
          refreshTitle="Refresh Threads"
          onRefresh={onRefresh}
        />
      }
    />
  );
}

function countUnavailableRoots(project: CodexDesktopProject): number {
  return project.roots.filter((root) => !root.isAvailable).length;
}

function getRootRoleLabel(index: number): string {
  return index === 0 ? "Primary Folder" : `Attached Folder ${index}`;
}

function getRootActionLabel(path: string, index: number): string {
  return `${getRootRoleLabel(index)}: ${nodePath.basename(path) || tildeifyPath(path)}`;
}

function getThreadSectionSubtitle(
  availableCount: number,
  unavailableCount: number,
): string {
  if (unavailableCount === 0) {
    return String(availableCount);
  }

  return `${availableCount} available, ${unavailableCount} unavailable`;
}

const projectSortOptions: Array<{
  value: CodexProjectSortOrder;
  title: string;
  icon: Icon;
  color: Color;
}> = [
  {
    value: "default",
    title: "Default",
    icon: Icon.AppWindowList,
    color: Color.SecondaryText,
  },
  { value: "name", title: "Name", icon: Icon.Text, color: Color.Blue },
  {
    value: "thread-count",
    title: "Thread Count",
    icon: Icon.Message,
    color: Color.Purple,
  },
  {
    value: "folder-count",
    title: "Folder Count",
    icon: Icon.Folder,
    color: Color.Orange,
  },
];
