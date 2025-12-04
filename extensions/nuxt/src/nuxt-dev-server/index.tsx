/**
 * Nuxt Dev Server Monitor - Menu Bar Command
 *
 * Detects and monitors running Nuxt development servers on ports 3000-3010.
 * Provides quick actions to open browser, run analyze, view GitHub repo, and stop servers.
 */

import { MenuBarExtra, Icon, openExtensionPreferences } from "@raycast/api";
import { useNuxtProcesses, mergeProcessWithDetails, getUniquePorts } from "./hooks/useNuxtProcesses";
import { ServerSubmenu } from "./components/ServerSubmenu";
import { DocumentationSection } from "./components/DocumentationSection";
import { NoServersSection } from "./components/NoServersSection";

export default function Command() {
  const { processes, processDetails, isLoading, revalidate } = useNuxtProcesses();

  const hasServersRunning = processes.length > 0;
  const uniquePorts = getUniquePorts(processes);

  // Menu bar icon and title
  const icon = { source: "icon.png" };
  const title = hasServersRunning ? `${processes.length}` : undefined;

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading} tooltip="Nuxt Dev Server Monitor">
      {hasServersRunning ? (
        <>
          {/* Running Servers */}
          <MenuBarExtra.Section title="Running Servers">
            {uniquePorts.map((port) => {
              // Get all processes on this port (usually just one)
              const processesOnPort = processes.filter((p) => p.port === port);
              const mainProcess = processesOnPort[0];

              // Merge process with cached details
              const details = processDetails.get(mainProcess.pid);
              const enrichedProcess = mergeProcessWithDetails(mainProcess, details);

              // Display name: project name or "Port X"
              const projectName = enrichedProcess.projectInfo?.name || `Port ${port}`;

              return (
                <ServerSubmenu key={port} process={enrichedProcess} projectName={projectName} revalidate={revalidate} />
              );
            })}
          </MenuBarExtra.Section>

          {/* Refresh */}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <NoServersSection onRefresh={revalidate} />
      )}

      {/* Documentation (always visible) */}
      <DocumentationSection />

      {/* Preferences */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Preferences..."
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
