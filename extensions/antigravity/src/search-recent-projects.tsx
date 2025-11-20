import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { openInAntigravity } from "./utils";

const execAsync = promisify(exec);

interface RecentEntry {
  folderUri?: string;
  fileUri?: string;
  label?: string;
}

interface HistoryResult {
  entries: RecentEntry[];
}

export default function Command() {
  const [projects, setProjects] = useState<RecentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentProjects() {
      try {
        const dbPath = join(
          homedir(),
          "Library/Application Support/Antigravity/User/globalStorage/state.vscdb",
        );
        const query =
          "SELECT value FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'";
        const command = `sqlite3 "${dbPath}" "${query}"`;

        const { stdout } = await execAsync(command);
        if (stdout) {
          const result = JSON.parse(stdout) as HistoryResult;
          setProjects(result.entries.filter((e) => e.folderUri || e.fileUri));
        }
      } catch (error) {
        console.error("Error fetching recent projects:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch recent projects",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentProjects();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent projects..."
    >
      {projects.map((entry, index) => {
        const uri = entry.folderUri || entry.fileUri;
        if (!uri) return null;

        const path = uri.replace("file://", "").replace(homedir(), "~");
        const name = path.split("/").pop() || path;
        const isFile = !!entry.fileUri;

        return (
          <List.Item
            key={index}
            title={name}
            subtitle={path}
            icon={isFile ? Icon.Document : Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Antigravity"
                  onAction={() => openInAntigravity(uri.replace("file://", ""))}
                />
                <Action
                  title="Open in New Window"
                  icon={Icon.AppWindow}
                  onAction={() =>
                    openInAntigravity(uri.replace("file://", ""), {
                      newWindow: true,
                    })
                  }
                />
                <Action.ShowInFinder path={uri.replace("file://", "")} />
                <Action.CopyToClipboard title="Copy Name" content={name} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={uri.replace("file://", "")}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
