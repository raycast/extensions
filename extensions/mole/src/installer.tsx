import { List, Icon, Color, ActionPanel, Action, Toast, showToast, confirmAlert, trash } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { useState, useEffect } from "react";
import { getMolePathSafe } from "./utils/mole";
import { formatBytes } from "./utils/parsers";
import { MoleNotInstalled } from "./components/MoleNotInstalled";

interface InstallerFile {
  name: string;
  path: string;
  size: number;
  location: string;
  extension: string;
}

const EXTENSIONS = [".dmg", ".pkg", ".iso"];

function useInstallerFiles() {
  const [files, setFiles] = useState<InstallerFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const scan = () => {
    const home = process.env.HOME || "";
    const dirs = [
      { path: join(home, "Downloads"), label: "Downloads" },
      { path: join(home, "Desktop"), label: "Desktop" },
      { path: join(home, "Documents"), label: "Documents" },
    ];

    const found: InstallerFile[] = [];

    for (const dir of dirs) {
      try {
        const entries = readdirSync(dir.path);
        for (const entry of entries) {
          const ext = entry.substring(entry.lastIndexOf(".")).toLowerCase();
          if (!EXTENSIONS.includes(ext)) continue;
          const fullPath = join(dir.path, entry);
          try {
            const stat = statSync(fullPath);
            found.push({
              name: entry,
              path: fullPath,
              size: stat.size,
              location: dir.label,
              extension: ext.toUpperCase().replace(".", ""),
            });
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    found.sort((a, b) => b.size - a.size);
    setFiles(found);
    setIsLoading(false);
  };

  useEffect(() => {
    scan();
  }, []);

  return { files, isLoading, revalidate: scan };
}

export default function CleanInstallers() {
  const molePath = getMolePathSafe();

  if (!molePath) {
    return <MoleNotInstalled />;
  }

  return <InstallerView />;
}

function InstallerView() {
  const { files, isLoading, revalidate } = useInstallerFiles();
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  async function handleRemoveAll() {
    if (
      await confirmAlert({
        title: "Remove All Installers",
        message: `This will trash ${files.length} installer files (${formatBytes(totalSize)}). This action cannot be undone.`,
        primaryAction: { title: "Remove All" },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Removing installers..." });
      try {
        await trash(files.map((f) => f.path));
        toast.style = Toast.Style.Success;
        toast.title = "Installers removed";
        toast.message = `${formatBytes(totalSize)} freed`;
        revalidate();
      } catch (err) {
        await showFailureToast(err, { title: "Remove failed" });
      }
    }
  }

  if (!isLoading && files.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Installers Found"
          description="No .dmg, .pkg, or .iso files in Downloads, Desktop, or Documents."
          icon={Icon.Checkmark}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installers...">
      {files.length > 0 && (
        <>
          <List.Section title="Summary">
            <List.Item
              title="Total Installer Files"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              accessories={[
                { tag: { value: formatBytes(totalSize), color: Color.Red } },
                { text: `${files.length} files` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleRemoveAll}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          {files.map((file) => (
            <List.Item
              key={file.path}
              title={file.name}
              subtitle={file.location}
              icon={Icon.Document}
              accessories={[{ tag: file.extension }, { tag: formatBytes(file.size) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove This File"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: `Remove ${file.name}?`,
                          message: `This will trash ${file.name} (${formatBytes(file.size)}).`,
                          primaryAction: { title: "Remove" },
                        })
                      ) {
                        try {
                          await trash(file.path);
                          await showToast({ style: Toast.Style.Success, title: `${file.name} removed` });
                          revalidate();
                        } catch (err) {
                          await showFailureToast(err, { title: "Remove failed" });
                        }
                      }
                    }}
                  />
                  <Action
                    title="Remove All"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleRemoveAll}
                  />
                  <Action.ShowInFinder path={file.path} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
