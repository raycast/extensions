/**
 * Server submenu component for displaying a single Nuxt server with actions
 */

import { MenuBarExtra, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import type { NuxtProcess } from "../utils/process";
import { handleOpenBrowser, handleStopServer, handleOpenRepository } from "../utils/actions";

interface ServerSubmenuProps {
  process: NuxtProcess;
  projectName: string;
  revalidate: () => void;
}

export function ServerSubmenu({ process, projectName, revalidate }: ServerSubmenuProps) {
  const { port, pid, projectInfo, memory, cpu, cwd } = process;

  const handleQuickCreate = async (type: string) => {
    if (!cwd) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project path not found",
        message: "Cannot determine project directory",
      });
      return;
    }

    try {
      await launchCommand({
        name: "quick-create",
        type: LaunchType.UserInitiated,
        context: { type, projectPath: cwd },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Quick Create",
        message: String(error),
      });
    }
  };

  return (
    <MenuBarExtra.Submenu title={projectName} icon={Icon.Box}>
      {/* Project Information */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Port: ${port}`} icon={Icon.Network} />
        {projectInfo?.version && <MenuBarExtra.Item title={`Version: ${projectInfo.version}`} icon={Icon.Tag} />}
        {memory && <MenuBarExtra.Item title={`Memory: ${memory}`} icon={Icon.MemoryChip} />}
        {cpu && <MenuBarExtra.Item title={`CPU: ${cpu}`} icon={Icon.Gauge} />}
      </MenuBarExtra.Section>

      {/* Quick Actions */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open in Browser" icon={Icon.Globe} onAction={() => handleOpenBrowser(port)} />
        {projectInfo?.repository && (
          <MenuBarExtra.Item
            title="Open GitHub Repo"
            icon={Icon.Link}
            onAction={() => handleOpenRepository(projectInfo.repository!)}
          />
        )}
      </MenuBarExtra.Section>

      {/* Quick Create */}
      {cwd && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Create Component" icon={Icon.Box} onAction={() => handleQuickCreate("component")} />
          <MenuBarExtra.Item title="Create Page" icon={Icon.Document} onAction={() => handleQuickCreate("page")} />
          <MenuBarExtra.Item title="Create API Route" icon={Icon.Code} onAction={() => handleQuickCreate("api")} />
          <MenuBarExtra.Item
            title="Create Composable"
            icon={Icon.Wand}
            onAction={() => handleQuickCreate("composable")}
          />
        </MenuBarExtra.Section>
      )}

      {/* Stop Server */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Stop Server (PID: ${pid})`}
          icon={Icon.Stop}
          onAction={() => handleStopServer(pid, revalidate)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );
}
