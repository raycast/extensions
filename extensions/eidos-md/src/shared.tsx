// What both commands share: the preferences, the projects list, a project's actions, and the view shown when there is
// no Eidos on this machine (Raycast Extension REQ14).
import { Action, getPreferenceValues, Icon, Keyboard, List, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { spawn } from "node:child_process";
import { appBinary, EidosError } from "./lib/eidos";
import { DOWNLOAD_URL, openLink } from "./lib/links";
import { knownProjects, type Project } from "./lib/projects";

export interface Preferences {
  includeRecent?: boolean;
  editor?: { path: string; name: string; bundleId?: string };
  eidosPath?: string;
}

export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

// The folders the person added in Project Folders, beside the app's recent projects and the projects folder.
export function useProjectFolders() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>("project-folders", []);
  return { folders: value ?? [], setFolders: setValue, isLoading };
}

export function useProjects() {
  const { folders, isLoading: foldersLoading } = useProjectFolders();
  const { includeRecent } = preferences();
  const projects = useCachedPromise(
    async (extra: string[], includeRecent: boolean) => knownProjects({ extraFolders: extra, includeRecent }),
    [folders, includeRecent !== false],
    {
      keepPreviousData: true,
      execute: !foldersLoading,
    },
  );
  return { ...projects, isLoading: projects.isLoading || foldersLoading };
}

// The app opens the project as it opens a folder handed to it (The Desktop App REQ25), which every version of it does:
// on macOS by the app's name, on Windows by its binary, which hands the folder to the copy already running.
export async function openProject(root: string): Promise<void> {
  try {
    if (process.platform === "darwin") {
      await open(root, "Eidos MD");
      return;
    }
    const binary = await appBinary();
    if (binary) {
      spawn(binary, [root], { detached: true, stdio: "ignore", windowsHide: false }).unref();
      return;
    }
    await open(openLink(root));
  } catch (cause) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Eidos MD did not open",
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

export async function openPage(root: string, route: string): Promise<void> {
  try {
    await open(openLink(root, route));
  } catch (cause) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Eidos MD did not open",
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

export function OpenInEditor(props: { path: string; title?: string }) {
  const { editor } = preferences();
  const title = props.title ?? "Open in Editor";
  if (editor)
    return (
      <Action.Open
        title={`${title} (${editor.name})`}
        target={props.path}
        application={editor.path}
        icon={Icon.Code}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    );
  return <Action.OpenWith title={title} path={props.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />;
}

export function FileActions(props: { path: string }) {
  return (
    <>
      <Action.ShowInFinder
        path={props.path}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "f" },
          Windows: { modifiers: ["ctrl", "shift"], key: "f" },
        }}
      />
      <Action.CopyToClipboard title="Copy Path" content={props.path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
    </>
  );
}

export function ProjectQuicklink(props: { project: Project }) {
  return (
    <Action.CreateQuicklink
      title="Create Quicklink to Project"
      quicklink={{ name: `Open ${props.project.name}`, link: openLink(props.project.root) }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "l" },
        Windows: { modifiers: ["ctrl", "shift"], key: "l" },
      }}
    />
  );
}

// Neither the app nor the CLI on this machine, or a CLI that would not run.
export function NoEidos(props: { error: unknown }) {
  const missing = props.error instanceof EidosError && props.error.missing;
  const message = props.error instanceof Error ? props.error.message : String(props.error);
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={missing ? "Eidos MD is not on this computer" : "eidos could not read this project"}
      description={
        missing
          ? "Install Eidos MD to open and search your projects, or set where eidos is in this extension's preferences."
          : message
      }
      actions={missing ? <DownloadAction /> : undefined}
    />
  );
}

export function DownloadAction() {
  return <Action.OpenInBrowser title="Download Eidos MD" url={DOWNLOAD_URL} />;
}

export function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const minutes = Math.round((Date.now() - at.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return at.toLocaleDateString();
}
