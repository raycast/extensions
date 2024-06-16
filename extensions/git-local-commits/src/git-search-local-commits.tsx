import { List, ActionPanel, Action, getPreferenceValues, showToast, Toast, Application, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import os from "os";
import simpleGit from "simple-git";

type Preferences = {
  directory: string;
  codeEditor: Application;
  customCommand?: string;
};

function expandHomeDir(directory: string): string {
  if (directory.startsWith("~")) {
    return path.join(os.homedir(), directory.slice(1));
  }
  return path.resolve(directory);
}

async function isGitRepository(dir: string): Promise<boolean> {
  const gitDir = path.join(dir, ".git");
  try {
    const stats = await fs.promises.stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function getSubdirectories(rootDir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(rootDir);
  const directories = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry);
      const entryStat = await fs.promises.stat(fullPath);
      return entryStat.isDirectory() ? fullPath : null;
    })
  );
  const gitDirectories = await Promise.all(
    directories.map(async (dir) => {
      if (dir && await isGitRepository(dir)) {
        return dir;
      }
      return null;
    })
  );
  return gitDirectories.filter(Boolean) as string[];
}

async function getCommits(directory: string): Promise<{ hash: string; message: string; date: string }[]> {
  const git = simpleGit(directory);
  try {
    const log = await git.log();
    return log.all.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      date: new Date(commit.date).toLocaleString(),
    }));
  } catch (error) {
    if (typeof error === "string" && error.includes("does not have any commits yet")) {
      return [];
    } else if (error instanceof Error && error.message.includes("does not have any commits yet")) {
      return [];
    }
    throw error;
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [subdirs, setSubdirs] = useState<string[]>([]);
  const [commits, setCommits] = useState<{ hash: string; message: string; date: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubdirs() {
      try {
        const rootDir = expandHomeDir(preferences.directory);
        if (!fs.existsSync(rootDir)) {
          throw new Error("The specified root directory does not exist.");
        }
        const dirs = await getSubdirectories(rootDir);
        setSubdirs(dirs);
        if (dirs.length === 0) {
          setError("No Git repositories found. Please check your root directory.");
        } else {
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        showToast(Toast.Style.Failure, "Error fetching subdirectories", errorMessage);
      }
    }

    fetchSubdirs();
  }, [preferences.directory]);

  useEffect(() => {
    if (!selectedDir) return;

    async function fetchCommits() {
      try {
        if (selectedDir) {
          const commits = await getCommits(selectedDir);
          setCommits(commits);
          if (commits.length === 0) {
            setError("No commits found in this repository.");
          } else {
            setError(null);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        showToast(Toast.Style.Failure, "Error fetching commits", errorMessage);
      }
    }

    fetchCommits();
  }, [selectedDir]);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error} />
      </List>
    );
  }

  if (selectedDir) {
    return (
      <List searchBarPlaceholder="View commits...">
        {commits.map((commit, index) => (
          <List.Item
            key={index}
            title={commit.message}
            subtitle={commit.date}
            accessories={[{ text: commit.hash }]}
            actions={
              <ActionPanel>
                {selectedDir && <Action title="Back to Repository List" onAction={() => setSelectedDir(null)} icon={Icon.ArrowLeft}  />}
                <Action.ShowInFinder title="Open in Finder" path={selectedDir} icon={Icon.Folder} />
                <Action.CopyToClipboard title="Copy Commit Message" content={commit.message} icon={Icon.CopyClipboard} />
              </ActionPanel>
            }
          />
        ))}
        {commits.length === 0 && <List.EmptyView title="No Commits Found" description="This repository does not have any commits yet." />}
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Select directory...">
      {subdirs.map((subdir) => (
        <List.Item
          key={subdir}
          title={path.basename(subdir)}
          actions={
            <ActionPanel>
              <Action title="View Commits" onAction={() => setSelectedDir(subdir)} icon={Icon.MagnifyingGlass} />
              <Action.ShowInFinder title="Open in Finder" path={subdir} icon={Icon.Folder} />
              <Action.Open title={'Open with ' + preferences.codeEditor.name} target={subdir} application={preferences.codeEditor} icon={Icon.Code} />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No Git Repositories Found" description={`No Git repositories found in ${preferences.directory}`} />
    </List>
  );
}
