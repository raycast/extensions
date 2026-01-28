import {
  getPreferenceValues,
  MenuBarExtra,
  open,
  showHUD,
  getApplications,
  LocalStorage,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { GitpodIcons } from "../constants";
import sinceTime from "../utils/sinceTime";

import { IWorkspace } from "./api/Gitpod/Models/IWorkspace";
import { IWorkspaceError } from "./api/Gitpod/Models/IWorkspaceError";
import { WorkspaceManager } from "./api/Gitpod/WorkspaceManager";
import { getCodeEncodedURI } from "./helpers/getVSCodeEncodedURI";
import { splitUrl } from "./helpers/splitURL";
import { dashboardPreferences } from "./preferences/dashboard_preferences";
import { Preferences } from "./preferences/repository_preferences";

export default function command() {
  const preferences = getPreferenceValues<dashboardPreferences>();
  const EditorPreferences = getPreferenceValues<Preferences>();
  const [isUnauthorised, setIsUnauthorized] = useState<boolean>(false);

  const workspaceManager = new WorkspaceManager(preferences.access_token ?? "");

  const [workspaces, setWorkspaces] = useState<IWorkspace[]>([]);
  const [vsCodePresent, setVSCodePresent] = useState<boolean>(false);

  const { isLoading } = usePromise(async () => {
    if (preferences.access_token) {
      await workspaceManager.init();
      const apps = await getApplications();

      // checking if vsCode is present in all the apps with its bundle id
      const CodePresent = apps.find((app) => {
        return app.bundleId && app.bundleId === "com.microsoft.VSCode";
      });

      if (CodePresent !== undefined) {
        setVSCodePresent(true);
      }
    }
  });

  useEffect(() => {
    if (preferences.access_token) {
      workspaceManager.on("workspaceUpdated", async () => {
        setWorkspaces(Array.from(WorkspaceManager.workspaces.values()));
      });
      workspaceManager.on("errorOccured", (e: IWorkspaceError) => {
        if (e.code === 401 || e.code === 500) {
          setIsUnauthorized(true);
        }
      });
    }
  }, [preferences.access_token]);

  if (isLoading) {
    return <MenuBarExtra isLoading={true}></MenuBarExtra>;
  }

  const activeWorkspaces = workspaces.filter(
    (workspace) => workspace.getStatus().phase === "PHASE_RUNNING" || workspace.getStatus().phase !== "PHASE_STOPPED"
  );

  const recentWorkspaces = workspaces.filter((workspace) => workspace.getStatus().phase === "PHASE_STOPPED");

  return (
    <MenuBarExtra icon={GitpodIcons.gitpod_logo_primary} isLoading={isLoading}>
      {preferences.access_token && !isUnauthorised && (
        <MenuBarExtra.Section title="Active Workspaces">
          {activeWorkspaces.map((workspace) => (
            <MenuBarExtra.Item
              key={workspace.getWorkspaceId()}
              icon={
                workspace.getStatus().phase === "PHASE_RUNNING"
                  ? GitpodIcons.running_icon_menubar
                  : GitpodIcons.progressing_icon_menubar
              }
              title={workspace.getDescription()}
              subtitle={sinceTime(new Date(workspace.createdAt)) + " ago"}
              onAction={() => {
                if (workspace.getStatus().phase === "PHASE_RUNNING") {
                  if (vsCodePresent && EditorPreferences.preferredEditor === "code-desktop") {
                    const vsCodeURI = getCodeEncodedURI(workspace);
                    open(vsCodeURI, "com.microsoft.VSCode");
                  } else if (EditorPreferences.preferredEditor === "ssh") {
                    const terminalURL = "ssh://" + workspace.getWorkspaceId() + "@" + splitUrl(workspace.getIDEURL());
                    open(terminalURL);
                  } else {
                    if (workspace.getIDEURL() !== "") {
                      if (EditorPreferences.preferredEditor === "code-desktop") {
                        showHUD("Unable to find VSCode Desktop, opening in VSCode Insiders.");
                      }
                      open(workspace.getIDEURL());
                    }
                  }
                }
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {preferences.access_token && !isUnauthorised && (
        <MenuBarExtra.Section title="Recent Workspaces">
          {recentWorkspaces.slice(0, 7).map((workspace) => (
            <MenuBarExtra.Item
              key={workspace.getWorkspaceId()}
              icon={GitpodIcons.stopped_icon_menubar}
              title={workspace.getDescription()}
              subtitle={sinceTime(new Date(workspace.createdAt)) + " ago"}
              onAction={async () => {
                try {
                  await workspace.start({ workspaceID: workspace.getWorkspaceId() });
                } catch (error) {
                  const workspaceError: IWorkspaceError = error as IWorkspaceError;
                  showHUD(workspaceError.message);
                }
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {preferences.access_token && !isUnauthorised && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Launch New Empty Workspace"
            icon={GitpodIcons.gitpod_logo_primary}
            key={"Launch New Empty Workspace"}
            onAction={async () => {
              const item = await LocalStorage.getItem("default_organization");
              if (item !== undefined) {
                IWorkspace.create(WorkspaceManager.api, {
                  contextUrl: "https://github.com/gitpod-io/empty",
                  organizationId: item.toString(),
                  ignoreRunningPrebuild: true,
                  ignoreRunningWorkspaceOnSameCommit: true,
                  ideSetting: {
                    defaultIde:
                      EditorPreferences.preferredEditor === "ssh" ? "code" : EditorPreferences.preferredEditor,
                    useLatestVersion: false,
                  },
                });
              } else {
                launchCommand({
                  name: "gitpod_dashboard",
                  type: LaunchType.UserInitiated,
                });
              }
            }}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="Utilities">
        <MenuBarExtra.Item
          title="Dashboard"
          icon={GitpodIcons.dashboard_icon}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => open("https://gitpod.io/workspaces")}
        />
        <MenuBarExtra.Item
          title="My Projects"
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          icon={GitpodIcons.project_icon}
          onAction={() => open("https://gitpod.io/projects")}
        />
        <MenuBarExtra.Item
          title="My Settings"
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          icon={GitpodIcons.settings_icon}
          onAction={() => open("https://gitpod.io/user/account")}
        />
        <MenuBarExtra.Item
          title="Documentation"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          icon={GitpodIcons.docs_icon}
          onAction={() => open("https://www.gitpod.io/docs/introduction")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Command Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={async () => await openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
