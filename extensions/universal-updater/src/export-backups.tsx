import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  open,
  showHUD,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

import {
  EcosystemId,
  listInstalledPackages,
  isEcosystemAvailable,
  installPackage,
} from "./ecosystems";

const BACKUP_DIR = join(homedir(), ".universal-updater-backups");
const DESKTOP_DIR = join(homedir(), "Desktop");

type BackupFile = {
  timestamp: string;
  date: Date;
  filename: string;
  size: number;
};

export async function createBackup(): Promise<{
  desktopPath: string;
  hiddenPath: string;
}> {
  const prefs = getPreferenceValues<Preferences>();

  const enabledIds = (
    [
      "brew",
      "npm",
      "yarn",
      "pnpm",
      "pip",
      "pipx",
      "cargo",
      "gem",
      "mas",
      "go",
      "bun",
      "deno",
      "composer",
    ] as EcosystemId[]
  ).filter(
    (id) =>
      prefs[
        `enable${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof Preferences
      ],
  );

  const backup: Record<string, Record<string, string>> = {};
  let packageCount = 0;

  for (const id of enabledIds) {
    try {
      const available = await isEcosystemAvailable(id);
      if (!available) continue;

      const packages = await listInstalledPackages(id);
      backup[id] = {};
      for (const pkg of packages) {
        backup[id][pkg.name] = pkg.current;
        packageCount++;
      }
    } catch {
      // Skip ecosystems that fail
    }
  }

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const filename = `universal-backup-${timestamp}.json`;
  const jsonContent = JSON.stringify(backup, null, 2);

  // Save to hidden backup directory
  try {
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
    }
  } catch {
    // Directory might exist
  }
  const hiddenPath = join(BACKUP_DIR, filename);
  writeFileSync(hiddenPath, jsonContent, "utf-8");

  // Save to Desktop
  let desktopPath = "";
  try {
    if (!existsSync(DESKTOP_DIR)) {
      mkdirSync(DESKTOP_DIR, { recursive: true });
    }
    desktopPath = join(DESKTOP_DIR, filename);
    writeFileSync(desktopPath, jsonContent, "utf-8");
  } catch {
    desktopPath = hiddenPath;
  }

  // Send macOS notification
  try {
    const notifScript = `display notification "Backup created with ${packageCount} packages" with title "Universal Updater" subtitle "${filename}"`;
    await execFileAsync("osascript", ["-e", notifScript]);
  } catch {
    // Notification not critical
  }

  return { desktopPath, hiddenPath };
}

async function rollbackToBackup(filePath: string): Promise<string> {
  // Support both desktop and hidden backup paths
  let data: string;
  try {
    data = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Could not read backup file: ${filePath}`);
  }

  const backup = JSON.parse(data) as Record<string, Record<string, string>>;

  let results = "Restore Results:\n\n";
  let totalRestored = 0;
  let totalFailed = 0;

  for (const [ecosystemId, packages] of Object.entries(backup)) {
    const ecosystem = ecosystemId as EcosystemId;
    const available = await isEcosystemAvailable(ecosystem);
    if (!available) {
      results += `⚠️ ${ecosystem}: Not installed on this system\n`;
      continue;
    }

    results += `\n📦 ${ecosystem}:\n`;
    let installed = 0;
    let failed = 0;

    for (const [name, version] of Object.entries(packages)) {
      try {
        await installPackage(ecosystem, name, { version });
        installed++;
        totalRestored++;
      } catch (err: unknown) {
        failed++;
        totalFailed++;
        // Continue if individual package restore fails
      }
    }

    results += `  ✓ Installed: ${installed}\n`;
    if (failed > 0) results += `  ✗ Failed: ${failed}\n`;
  }

  results += `\n✅ Total restored: ${totalRestored}\n`;
  if (totalFailed > 0) results += `❌ Total failed: ${totalFailed}\n`;

  // Send success notification
  try {
    const notifScript = `display notification "${totalRestored} packages restored" with title "Universal Updater" subtitle "Restore completed"`;
    await execFileAsync("osascript", ["-e", notifScript]);
  } catch {
    // Notification not critical
  }

  return results;
}

function listBackups(): BackupFile[] {
  try {
    if (!existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = readdirSync(BACKUP_DIR);
    return files
      .filter(
        (f: string) =>
          (f.startsWith("backup-") || f.startsWith("universal-backup-")) &&
          f.endsWith(".json"),
      )
      .map((filename: string) => {
        const filepath = join(BACKUP_DIR, filename);
        const stat = statSync(filepath);
        const timestamp = filename
          .replace("backup-", "")
          .replace("universal-backup-", "")
          .replace(".json", "");
        const isoTime = timestamp.replaceAll("-", (m: string, i: number) => {
          if (i === 10 || i === 13) return ":";
          if (i === 16) return ".";
          return m;
        });

        return {
          filename,
          timestamp,
          date: new Date(isoTime),
          size: stat.size,
        };
      })
      .sort(
        (a: BackupFile, b: BackupFile) => b.date.getTime() - a.date.getTime(),
      );
  } catch {
    return [];
  }
}

async function exportToShellScript(backup: BackupFile) {
  const filepath = join(BACKUP_DIR, backup.filename);
  const data = readFileSync(filepath, "utf-8");
  const json = JSON.parse(data) as Record<string, Record<string, string>>;

  let script =
    "#!/bin/bash\n\n# Universal Updater - Install Script\n# Generated on " +
    backup.date.toLocaleString() +
    "\n\n";

  for (const [ecosystem, packages] of Object.entries(json)) {
    if (Object.keys(packages).length === 0) continue;
    script += `echo "Installing ${ecosystem} packages..."\n`;
    for (const [name, version] of Object.entries(packages)) {
      const cleanVer = version?.trim();
      const safeName = "'" + name.replaceAll("'", "'\\''") + "'";
      if (ecosystem === "brew") script += `brew install ${safeName}\n`;
      else if (ecosystem === "npm") {
        const target = cleanVer ? `${name}@${cleanVer}` : name;
        script += `npm install -g '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "yarn") {
        const target = cleanVer ? `${name}@${cleanVer}` : name;
        script += `yarn global add '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "pnpm") {
        const target = cleanVer ? `${name}@${cleanVer}` : name;
        script += `pnpm add -g '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "pip") {
        const target = cleanVer ? `${name}==${cleanVer}` : name;
        script += `pip install '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "pipx") {
        const target = cleanVer ? `${name}==${cleanVer}` : name;
        script += `pipx install '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "gem") {
        const verSuffix = cleanVer
          ? ` -v '${cleanVer.replaceAll("'", "'\\''")}'`
          : "";
        script += `gem install ${safeName}${verSuffix}\n`;
      } else if (ecosystem === "cargo") {
        const verSuffix = cleanVer
          ? ` --version '${cleanVer.replaceAll("'", "'\\''")}'`
          : "";
        script += `cargo install ${safeName}${verSuffix}\n`;
      } else if (ecosystem === "go") {
        const verSuffix = cleanVer
          ? cleanVer.startsWith("v")
            ? cleanVer
            : `v${cleanVer}`
          : "latest";
        script += `go install '${name.replaceAll("'", "'\\''")}@${verSuffix}'\n`;
      } else if (ecosystem === "mas") script += `mas install ${safeName}\n`;
      else if (ecosystem === "bun") {
        const target = cleanVer ? `${name}@${cleanVer}` : name;
        script += `bun install -g '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "deno") {
        const target = cleanVer ? `${name}@${cleanVer}` : name;
        script += `deno install -g '${target.replaceAll("'", "'\\''")}'\n`;
      } else if (ecosystem === "composer") {
        const target = cleanVer ? `${name}:${cleanVer}` : name;
        script += `composer global require '${target.replaceAll("'", "'\\''")}'\n`;
      }
    }
    script += "\n";
  }

  const shFilename = backup.filename.replace(".json", ".sh");
  const desktopPath = join(DESKTOP_DIR, shFilename);
  writeFileSync(desktopPath, script, "utf-8");
  await execFileAsync("chmod", ["+x", desktopPath]);
  return desktopPath;
}

function BackupDetailView(props: Readonly<{ backup: BackupFile }>) {
  const { backup } = props;
  const [content, setContent] = useState("");
  const [rollbackResult, setRollbackResult] = useState<string | null>(null);

  useEffect(() => {
    try {
      const filepath = join(BACKUP_DIR, backup.filename);
      const data = readFileSync(filepath, "utf-8");
      const json = JSON.parse(data);

      let markdown =
        `# Backup from ${backup.date.toLocaleString()}\n\n` +
        `**File:** \`${backup.filename}\`\n\n`;

      for (const [ecosystem, packages] of Object.entries(json)) {
        const pkgRecord = packages as Record<string, string>;
        const pkgCount = Object.keys(pkgRecord).length;
        markdown += `## ${ecosystem}\n\n**Total:** ${pkgCount} package(s)\n\n`;

        markdown += "| Package | Version |\n|---|---|\n";
        for (const [name, version] of Object.entries(pkgRecord)) {
          markdown += `| \`${name}\` | \`${version}\` |\n`;
        }
        markdown += "\n";
      }

      setContent(markdown);
    } catch (err) {
      setContent(`# Error\n\nFailed to load backup: ${String(err)}`);
    }
  }, [backup]);

  const handleRollback = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restoring packages…",
    });

    try {
      const filepath = join(BACKUP_DIR, backup.filename);
      const result = await rollbackToBackup(filepath);
      setRollbackResult(result);
      toast.style = Toast.Style.Success;
      toast.title = "Restore completed!";
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Restore failed";
      toast.message = err?.message ?? String(err);
    }
  };

  if (rollbackResult) {
    return (
      <List
        navigationTitle="Rollback Result"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Result"
              content={rollbackResult}
            />
          </ActionPanel>
        }
      >
        <List.Item title="Rollback completed" subtitle={rollbackResult} />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Backup Details"
      actions={
        <ActionPanel>
          <Action
            title="Rollback to This Version"
            icon={Icon.RotateClockwise}
            onAction={() => void handleRollback()}
          />
          <Action
            title="Export to Shell Script"
            icon={Icon.Terminal}
            onAction={async () => {
              try {
                const path = await exportToShellScript(backup);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Exported",
                  message: `Saved to ${path}`,
                });
              } catch (err: any) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Export Failed",
                  message: err?.message,
                });
              }
            }}
          />
          <Action.CopyToClipboard title="Copy as JSON" content={content} />
          <Action
            title="Open Backup File"
            icon={Icon.Finder}
            onAction={() => {
              const desktopPath = join(DESKTOP_DIR, backup.filename);
              const fileToOpen = existsSync(desktopPath)
                ? desktopPath
                : join(BACKUP_DIR, backup.filename);
              open(`file://${fileToOpen}`);
            }}
          />
        </ActionPanel>
      }
    >
      <List.Item title="Loading..." />
    </List>
  );
}

export default function Command() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const files = listBackups();
    setBackups(files);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  const createNewBackup = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating backup…",
    });

    try {
      await createBackup();
      toast.style = Toast.Style.Success;
      toast.title = "✅ Backup created!";
      toast.message = `Saved to Desktop for easy sharing`;

      await refresh();
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Backup failed";
      toast.message = err?.message ?? String(err);
    }
  }, [refresh]);

  const importBackup = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Select backup file…",
    });

    try {
      // Use macOS file picker via osascript
      const script = `set response to (choose file of type {"public.json", "com.apple.json"} with prompt "Select backup JSON file")
return POSIX path of response`;
      const { stdout } = await execFileAsync("osascript", ["-e", script]);
      const result = stdout.trim();

      if (!result) return;

      toast.style = Toast.Style.Animated;
      toast.title = "Restoring packages from file…";

      const restoreResult = await rollbackToBackup(result);

      toast.style = Toast.Style.Success;
      toast.title = "✅ Restore completed!";
      await showHUD(`${restoreResult}`);
    } catch (err: any) {
      if (String(err).includes("User cancelled")) {
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Restore failed";
      toast.message = err?.message ?? String(err);
    }
  }, []);

  if (selectedBackup) {
    return <BackupDetailView backup={selectedBackup} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Version Backups"
      searchBarPlaceholder="Search backups…"
      actions={
        <ActionPanel>
          <Action
            title="Create New Backup"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => void createNewBackup()}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Actions">
        <List.Item
          title="📦 Create New Backup"
          subtitle="Save all package versions to Desktop"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Create Backup"
                icon={Icon.Plus}
                onAction={() => void createNewBackup()}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="📂 Import Backup File"
          subtitle="Restore packages from a backup file"
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action
                title="Select File & Restore"
                icon={Icon.Download}
                onAction={() => void importBackup()}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {backups.length > 0 && (
        <List.Section title={`Saved Backups (${backups.length})`}>
          {backups.map((backup) => (
            <List.Item
              key={backup.filename}
              title={backup.date.toLocaleString()}
              subtitle={`${backup.filename} (${Math.round(backup.size / 1024)}KB)`}
              icon={Icon.Document}
              accessories={[
                {
                  text: backup.date.toLocaleDateString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => setSelectedBackup(backup)}
                  />
                  <Action
                    title="Show in Finder"
                    icon={Icon.Finder}
                    onAction={() => {
                      const desktopFile = join(DESKTOP_DIR, backup.filename);
                      if (existsSync(desktopFile)) {
                        open(`file://${desktopFile}`);
                      } else {
                        open(`file://${join(BACKUP_DIR, backup.filename)}`);
                      }
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={join(BACKUP_DIR, backup.filename)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {backups.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Document}
          title="No backups yet"
          description="Create your first backup to save current package versions"
          actions={
            <ActionPanel>
              <Action
                title="Create Backup"
                icon={Icon.Plus}
                onAction={() => void createNewBackup()}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
