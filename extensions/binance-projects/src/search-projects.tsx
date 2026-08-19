import {
  Action,
  ActionPanel,
  Application,
  Color,
  Grid,
  Icon,
  LaunchProps,
  List,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { projectDeeplink } from "./deeplink";
import { magicLinkUrl, type ProjectLinks } from "./links";
import { prunePins, togglePin } from "./pins";
import { buildProjectIndex, indexByGid, indexByPath, projectKeywords, type Project } from "./projects";
import { refreshProjectInSnapshot } from "./snapshot";

async function openInFinder(path: string) {
  await closeMainWindow();
  await open(path);
  const script = `
use framework "AppKit"

delay 0.15
set mainScreen to current application's NSScreen's mainScreen()
set screenFrame to mainScreen's frame()
set visibleFrame to mainScreen's visibleFrame()
set screenHeight to item 2 of item 2 of screenFrame
set visibleOrigin to item 1 of visibleFrame
set visibleSize to item 2 of visibleFrame
set screenLeft to item 1 of visibleOrigin
set screenTop to screenHeight - ((item 2 of visibleOrigin) + (item 2 of visibleSize))
set screenRight to screenLeft + (item 1 of visibleSize)
set screenBottom to screenHeight - (item 2 of visibleOrigin)
set screenMidY to screenTop + ((screenBottom - screenTop) div 2)

tell application "Finder"
  try
    set bounds of front Finder window to {screenLeft, screenMidY, screenRight, screenBottom}
  end try
end tell
`;
  try {
    await runAppleScript(script);
  } catch {
    // best-effort resize; if it fails, the folder is still open
  }
}

async function openWith(url: string, app?: Application) {
  await closeMainWindow();
  await open(url, app?.path);
}

async function openFrameAndFinder(frameUrl: string, finderPath: string, app?: Application) {
  await openWith(frameUrl, app);
  await openInFinder(finderPath);
}

type Prefs = {
  projectsRoot: string;
  linkApp?: Application;
  asanaApp?: Application;
};

export default function Command(props: LaunchProps<{ launchContext?: { gid?: string } }>) {
  const targetGid = props.launchContext?.gid;
  const { projectsRoot, linkApp, asanaApp } = getPreferenceValues<Prefs>();

  const {
    data: index,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(buildProjectIndex, [projectsRoot], {
    initialData: { years: [] },
  });

  const byPath = useMemo(() => indexByPath(index), [index]);
  const byGid = useMemo(() => indexByGid(index), [index]);
  const pathsKey = useMemo(() => Array.from(byPath.keys()).sort().join("\n"), [byPath]);

  // Deeplink: open a project's grid directly when launched with a gid. See ADR 0002.
  const { push } = useNavigation();
  const navigatedRef = useRef(false);
  const retriedRef = useRef(false);
  useEffect(() => {
    if (!targetGid || navigatedRef.current) return;
    const match = byGid.get(targetGid);
    if (match) {
      navigatedRef.current = true;
      push(<ProjectScreen project={match} linkApp={linkApp} asanaApp={asanaApp} />);
      return;
    }
    if (isLoading) return; // wait for data before treating it as a miss
    if (!retriedRef.current) {
      // Stale snapshot: force a disk rescan and retry the match once.
      retriedRef.current = true;
      revalidate();
      return;
    }
    navigatedRef.current = true;
    void showToast({
      style: Toast.Style.Failure,
      title: "No project for that link",
      message: `gid ${targetGid}`,
    });
  }, [targetGid, byGid, isLoading, push, revalidate, linkApp, asanaApp]);

  const { data: pins = [], revalidate: revalidatePins } = useCachedPromise(
    async (key: string) => prunePins(new Set(key ? key.split("\n") : [])),
    [pathsKey],
    { initialData: [] },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not read projects root"
          description={`${projectsRoot}\n${error.message}`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const noYears = !isLoading && index.years.length === 0;
  const pinnedProjects = pins.map((p) => byPath.get(p)).filter((p): p is Project => Boolean(p));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Binance projects…">
      {noYears ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No year folders found"
          description={`Expected YYYY/ subfolders under ${projectsRoot}`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {pinnedProjects.length > 0 && (
            <List.Section title="Pinned">
              {pinnedProjects.map((p) => (
                <ProjectItem
                  key={`pin:${p.path}`}
                  project={p}
                  isPinned
                  onPinChanged={revalidatePins}
                  onRefresh={revalidate}
                  linkApp={linkApp}
                  asanaApp={asanaApp}
                />
              ))}
            </List.Section>
          )}
          {index.years.map((section) => (
            <List.Section key={section.year} title={section.year}>
              {section.projects.map((p) => (
                <ProjectItem
                  key={p.path}
                  project={p}
                  isPinned={pins.includes(p.path)}
                  onPinChanged={revalidatePins}
                  onRefresh={revalidate}
                  linkApp={linkApp}
                  asanaApp={asanaApp}
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

type ItemProps = {
  project: Project;
  isPinned: boolean;
  onPinChanged: () => void;
  onRefresh: () => void;
  linkApp?: Application;
  asanaApp?: Application;
};

function ProjectItem({ project, isPinned, onPinChanged, onRefresh, linkApp, asanaApp }: ItemProps) {
  const { links, subfolders } = project;
  const keywords = projectKeywords(project);
  const accessories = buildAccessories(links, isPinned);

  return (
    <List.Item
      icon={Icon.Folder}
      title={project.name}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Project"
            icon={Icon.AppWindowGrid3x3}
            target={<ProjectScreen project={project} linkApp={linkApp} asanaApp={asanaApp} />}
          />
          <Action
            title="Open in Finder"
            icon={{ source: "finder.svg" }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => openInFinder(project.path)}
          />
          {links.asana && (
            <Action.Open
              title="Open Asana"
              target={links.asana}
              application={asanaApp}
              icon={{ source: "asana.svg" }}
              shortcut={{ modifiers: ["opt", "cmd"], key: "a" }}
            />
          )}
          {links.drive && (
            <Action.Open
              title="Open Google Drive"
              target={links.drive}
              application={linkApp}
              icon={{ source: "drive.svg" }}
              shortcut={{ modifiers: ["opt", "cmd"], key: "d" }}
            />
          )}
          {links.frameio && (
            <Action.Open
              title="Open Frame.io"
              target={links.frameio}
              application={linkApp}
              icon={{ source: "frame.svg" }}
              shortcut={{ modifiers: ["opt", "cmd"], key: "f" }}
            />
          )}
          {links.gid && (
            <Action.Open
              title="Open Magic Link Machine"
              target={magicLinkUrl(links.gid)}
              application={linkApp}
              icon={{ source: "mlm-icon.svg" }}
              shortcut={{ modifiers: ["opt", "cmd"], key: "m" }}
            />
          )}
          <ActionPanel.Section>
            <Action
              title={isPinned ? "Unpin Project" : "Pin Project"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["opt", "cmd"], key: "p" }}
              onAction={async () => {
                await togglePin(project.path);
                onPinChanged();
                await showToast({
                  style: Toast.Style.Success,
                  title: isPinned ? "Unpinned" : "Pinned",
                  message: project.name,
                });
              }}
            />
            <Action
              title="Refresh Project"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["opt", "cmd"], key: "r" }}
              onAction={async () => {
                await refreshProjectInSnapshot(getPreferenceValues<Prefs>().projectsRoot, project.year, project.name);
                onRefresh();
              }}
            />
          </ActionPanel.Section>
          {subfolders.length > 0 && (
            <ActionPanel.Section title="Subfolders">
              {subfolders.map((name, i) => (
                <Action
                  key={name}
                  title={`Open ${name}`}
                  icon={Icon.Folder}
                  onAction={() => openInFinder(`${project.path}/${name}`)}
                  shortcut={SUBFOLDER_KEYS[i] ? { modifiers: ["opt", "cmd"], key: SUBFOLDER_KEYS[i] } : undefined}
                />
              ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Folder Path"
              content={project.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Project Name"
              content={project.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
            {links.gid && (
              <Action.CopyToClipboard
                title="Copy Deeplink to Project"
                icon={Icon.Link}
                content={projectDeeplink(links.gid)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildAccessories(links: ProjectLinks, isPinned: boolean): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [];
  if (isPinned) acc.push({ icon: Icon.Pin });
  acc.push(linkIcon("asana.svg", "Asana", Boolean(links.asana)));
  acc.push(linkIcon("drive.svg", "Drive", Boolean(links.drive)));
  acc.push(linkIcon("frame.svg", "Frame.io", Boolean(links.frameio)));
  return acc;
}

function linkIcon(file: string, label: string, present: boolean): List.Item.Accessory {
  return present
    ? { icon: { source: file }, tooltip: label }
    : { icon: { source: file, tintColor: Color.SecondaryText }, tooltip: `No ${label}` };
}

const SUBFOLDER_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function ProjectScreen({
  project,
  linkApp,
  asanaApp,
}: {
  project: Project;
  linkApp?: Application;
  asanaApp?: Application;
}) {
  const { links, subfolders } = project;
  const frameUrl = links.frameio;
  const exportsFolder = subfolders.find((name) => /(?:^|_)exports?$/i.test(name));
  const frameFinderPath = exportsFolder ? `${project.path}/${exportsFolder}` : project.path;

  type LinkTile = {
    key: string;
    title: string;
    icon: string;
    url: string;
    app?: Application;
    shortcutKey: "a" | "d" | "f" | "m";
    shortcutLabel: string;
  };
  const linkTiles: LinkTile[] = [];
  if (links.asana)
    linkTiles.push({
      key: "asana",
      title: "Asana",
      icon: "asana.svg",
      url: links.asana,
      app: asanaApp,
      shortcutKey: "a",
      shortcutLabel: "⌥⌘A",
    });
  if (links.drive)
    linkTiles.push({
      key: "drive",
      title: "Google Drive",
      icon: "drive.svg",
      url: links.drive,
      app: linkApp,
      shortcutKey: "d",
      shortcutLabel: "⌥⌘D",
    });
  if (links.frameio)
    linkTiles.push({
      key: "frame",
      title: "Frame.io",
      icon: "frame.svg",
      url: links.frameio,
      app: linkApp,
      shortcutKey: "f",
      shortcutLabel: "⌥⌘F",
    });
  if (links.gid)
    linkTiles.push({
      key: "mlm",
      title: "Magic Link Machine",
      icon: "mlm-icon.svg",
      url: magicLinkUrl(links.gid),
      app: linkApp,
      shortcutKey: "m",
      shortcutLabel: "⌥⌘M",
    });

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Large}
      navigationTitle={project.name}
      searchBarPlaceholder={`Search ${project.name}…`}
    >
      {linkTiles.length > 0 && (
        <Grid.Section title="Links">
          {linkTiles.map((t) => (
            <Grid.Item
              key={t.key}
              content={{ source: t.icon }}
              title={t.title}
              subtitle={t.shortcutLabel}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open ${t.title}`}
                    icon={{ source: t.icon }}
                    onAction={() => openWith(t.url, t.app)}
                    shortcut={{ modifiers: ["opt", "cmd"], key: t.shortcutKey }}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={t.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
      <Grid.Section title="Folders">
        {frameUrl && (
          <Grid.Item
            key="__frame_and_root"
            content={{ source: "frame-finder.svg" }}
            title={exportsFolder ? "Frame.io + Exports" : "Frame.io + Finder"}
            subtitle="⌥⌘0"
            actions={
              <ActionPanel>
                <Action
                  title={exportsFolder ? "Open Frame.io + Exports" : "Open Frame.io + Finder"}
                  icon={{ source: "frame-finder.svg" }}
                  onAction={() => openFrameAndFinder(frameUrl, frameFinderPath, linkApp)}
                  shortcut={{ modifiers: ["opt", "cmd"], key: "0" }}
                />
              </ActionPanel>
            }
          />
        )}
        <Grid.Item
          key="__root"
          content={{ source: "finder.svg" }}
          title="Project Root"
          subtitle={frameUrl ? "⌥⌘1" : "⌥⌘0"}
          actions={
            <ActionPanel>
              <Action
                title="Open in Finder"
                icon={{ source: "finder.svg" }}
                onAction={() => openInFinder(project.path)}
                shortcut={{ modifiers: ["opt", "cmd"], key: frameUrl ? "1" : "0" }}
              />
              <Action.CopyToClipboard
                title="Copy Folder Path"
                content={project.path}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
        {subfolders.map((name, i) => {
          const subPath = `${project.path}/${name}`;
          const shortcutKey = SUBFOLDER_KEYS[i + (frameUrl ? 1 : 0)];
          return (
            <Grid.Item
              key={name}
              content={{ source: Icon.Folder, tintColor: Color.Blue }}
              title={name}
              subtitle={shortcutKey ? `⌥⌘${shortcutKey}` : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open ${name}`}
                    icon={Icon.Folder}
                    onAction={() => openInFinder(subPath)}
                    shortcut={shortcutKey ? { modifiers: ["opt", "cmd"], key: shortcutKey } : undefined}
                  />
                  <Action.CopyToClipboard
                    title="Copy Folder Path"
                    content={subPath}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
