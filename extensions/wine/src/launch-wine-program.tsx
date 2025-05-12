import { Icon, List } from "@raycast/api";
import { useState } from "react";
import * as path from "path";
import * as os from "os";
import { useWineApplications } from "./utils/useWineApplications";
import { ApplicationListItem } from "./components/ApplicationListItem";

export default function Command() {
  const [groupByFolder, setGroupByFolder] = useState(false);
  const { applications, isLoading } = useWineApplications();
  const wineProgramsPath = path.join(os.homedir(), ".local", "share", "applications", "wine", "Programs");

  const displayedApps = applications.filter((app) => {
    const isUninstall = app.name.toLowerCase().includes("uninstall");
    return !isUninstall || groupByFolder;
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Wine applications..."
      searchBarAccessory={
        <>
          <List.Dropdown tooltip="Group By" onChange={(v) => setGroupByFolder(v === "folder")} storeValue>
            <List.Dropdown.Item title="Programs" value="none" />
            <List.Dropdown.Item title="Folders" value="folder" />
          </List.Dropdown>
        </>
      }
    >
      {groupByFolder
        ? Object.entries(
            displayedApps.reduce(
              (acc, app) => {
                const rel = path.relative(wineProgramsPath, path.dirname(app.id)) || "Root";
                acc[rel] = acc[rel] || [];
                acc[rel].push(app);
                return acc;
              },
              {} as Record<string, typeof applications>,
            ),
          ).map(([section, items]) => (
            <List.Section title={section} key={section}>
              {items.map((app) => (
                <ApplicationListItem key={app.id} app={app} />
              ))}
            </List.Section>
          ))
        : displayedApps.map((app) => <ApplicationListItem key={app.id} app={app} />)}
      {!isLoading && displayedApps.length === 0 && (
        <List.EmptyView
          title="No Wine Applications Found"
          description="Check if .desktop files exist in ~/.local/share/applications/wine/Programs/ or its direct subfolders, or in paths configured in preferences."
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
