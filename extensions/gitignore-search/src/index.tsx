import { ActionPanel, CopyToClipboardAction, Icon, List, OpenInBrowserAction, showToast, ToastStyle, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

export default function GitIgnoreList() {
  const [state, setState] = useState<{ files: GitIgnore[] }>({ files: [] });

  useEffect(() => {
    async function fetch() {
      const files = await fetchFiles();
      setState((oldState) => ({
        ...oldState,
        files: files
          .filter(file => path.parse(file.path).ext === ".gitignore")
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.files.length === 0} searchBarPlaceholder="Filter files by name...">
      <List.Item
        id="link"
        key="link"
        title="View Gitignore repository"
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <OpenInBrowserAction url="https://github.com/github/gitignore" />
          </ActionPanel>
        }
      />
      
      {state.files.map((gitignore) => (
        <GitIgnoreListItem key={gitignore.sha} gitignore={gitignore} />
      ))}
    </List>
  );
}

function GitIgnoreListItem(props: { gitignore: GitIgnore }) {
  const gitignore = props.gitignore;
  const contentPath = `${environment.assetsPath}/gitignore/${gitignore.path}`;
  const contentExists = fs.existsSync(contentPath)
  return (
    <List.Item
      id={gitignore.sha}
      key={gitignore.sha}
      title={gitignore.name.replace('.gitignore','')}
      icon={contentExists ? Icon.Document : Icon.Link}
      accessoryTitle={gitignore.name}
      subtitle={contentExists ? "" : "Open on GitHub.com"}
      actions={
        <ActionPanel>
          {contentExists && <CopyToClipboardAction content={fs.readFileSync(`${environment.assetsPath}/gitignore/${gitignore.path}`, 'utf8')} />}
          <OpenInBrowserAction url={gitignore.download_url} />
        </ActionPanel>
      }
    />
  );
}

async function fetchFiles(): Promise<GitIgnore[]> {
  try {
    const response = await fetch("https://api.github.com/repos/github/gitignore/contents/");
    const json = await response.json();
    return (json as Record<string, unknown>) as unknown as GitIgnore[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load gitignore files");
    return Promise.resolve([]);
  }
}

type GitIgnore = {
  sha: string;
  name: string;
  path: string;
  download_url: string;
  type: string;
};
