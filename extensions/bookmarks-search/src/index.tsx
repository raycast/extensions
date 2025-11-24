import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs/promises";
import path from "path";
import os from "os";

// 1. Define supported browser types (Removed Safari)
type BrowserType = "chrome" | "edge";

interface BrowserConfig {
  name: string;
  icon: Icon;
  macPathPrefix: string[];
  winPathCandidates: string[][];
}

// 2. Configuration for Chrome & Edge
const BROWSERS: Record<BrowserType, BrowserConfig> = {
  chrome: {
    name: "Google Chrome",
    icon: Icon.Globe,
    macPathPrefix: ["Google", "Chrome"],
    winPathCandidates: [["Google", "Chrome", "User Data"]],
  },
  edge: {
    name: "Microsoft Edge",
    icon: Icon.Cloud,
    macPathPrefix: ["Microsoft Edge"],
    winPathCandidates: [["Microsoft", "Edge", "User Data"]],
  },
};

interface BookmarkNode {
  id: string;
  name: string;
  type: string;
  url?: string;
  children?: BookmarkNode[];
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  path: string;
  source: string;
}

const PROFILES_TO_CHECK = ["Default", "Profile 1", "Profile 2", "Profile 3"];

export default function Command() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserType>("chrome");
  const [error, setError] = useState<string | null>(null);
  const [permissionIssue, setPermissionIssue] = useState(false);

  useEffect(() => {
    async function fetchBookmarks() {
      setIsLoading(true);
      setError(null);
      setPermissionIssue(false);
      setBookmarks([]);

      try {
        const browserConfig = BROWSERS[selectedBrowser];
        const homeDir = os.homedir();
        const isMac = process.platform === "darwin";

        // Step 1: Prepare base paths
        const candidateBasePaths: string[] = [];

        if (isMac) {
          candidateBasePaths.push(
            path.join(
              homeDir,
              "Library",
              "Application Support",
              ...browserConfig.macPathPrefix,
            ),
          );
        } else {
          const localAppData =
            process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
          browserConfig.winPathCandidates.forEach((segments) => {
            candidateBasePaths.push(path.join(localAppData, ...segments));
          });
        }

        // Step 2: Search for Profile/Bookmarks file
        let foundPath = "";
        let foundProfile = "";

        outerLoop: for (const basePath of candidateBasePaths) {
          for (const profile of PROFILES_TO_CHECK) {
            const checkPath = path.join(basePath, profile, "Bookmarks");
            try {
              await fs.access(checkPath);
              foundPath = checkPath;
              foundProfile = profile;
              break outerLoop;
            } catch {
              // continue
            }
          }
        }

        if (!foundPath) {
          const osMsg = isMac
            ? "Full Disk Access permission"
            : "installation path";
          throw new Error(
            `Could not find ${browserConfig.name} bookmarks. Please check if installed or Raycast has ${osMsg}.`,
          );
        }

        // Step 3: Parse JSON
        const data = await fs.readFile(foundPath, "utf-8");
        const json = JSON.parse(data);
        const items: BookmarkItem[] = [];

        const roots = [
          json.roots?.bookmark_bar,
          json.roots?.other,
          json.roots?.synced,
        ].filter(Boolean);

        const traverse = (node: BookmarkNode, folderPath: string) => {
          if (node.type === "url" && node.url) {
            items.push({
              id: node.id,
              title: node.name,
              url: node.url,
              path: folderPath,
              source: foundProfile,
            });
          } else if (node.children) {
            const newPath = folderPath
              ? `${folderPath} / ${node.name}`
              : node.name;
            node.children.forEach((child) => traverse(child, newPath));
          }
        };

        roots.forEach((root) => traverse(root, ""));
        setBookmarks(items);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to read bookmarks";
        console.error(msg);
        setError(msg);

        if (
          msg.includes("EPERM") ||
          msg.includes("EACCES") ||
          msg.includes("Operation not permitted") ||
          msg.includes("Full Disk Access")
        ) {
          setPermissionIssue(true);
          showToast({
            style: Toast.Style.Failure,
            title: "Permission Error",
            message:
              "Please grant Raycast 'Full Disk Access' in System Settings.",
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: msg,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchBookmarks();
  }, [selectedBrowser]);

  const currentIcon = BROWSERS[selectedBrowser].icon;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${BROWSERS[selectedBrowser].name} bookmarks...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Browser"
          onChange={(newValue) => setSelectedBrowser(newValue as BrowserType)}
          value={selectedBrowser}
        >
          {Object.entries(BROWSERS).map(([key, config]) => (
            <List.Dropdown.Item
              key={key}
              title={config.name}
              value={key}
              icon={config.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={
            permissionIssue ? "Permission Denied" : "Unable to read bookmarks"
          }
          description={
            permissionIssue
              ? "Go to System Settings -> Privacy & Security -> Full Disk Access -> Enable Raycast."
              : `${error}`
          }
        />
      ) : bookmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No bookmarks found"
          description={`No bookmarks found in ${BROWSERS[selectedBrowser].name}.`}
        />
      ) : (
        bookmarks.map((item) => (
          <List.Item
            key={`${item.source}-${item.id}`}
            icon={currentIcon}
            title={item.title}
            subtitle={item.url}
            accessories={[{ text: item.path, icon: Icon.Folder }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard content={item.url} title="Copy URL" />
                <Action.CopyToClipboard
                  content={item.title}
                  title="Copy Title"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
