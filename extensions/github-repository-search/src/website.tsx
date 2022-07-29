import { ActionPanel, Action, Icon } from "@raycast/api";
import { Repository } from "./types";

export const WebIdes = [
  {
    title: "GitHub Dev",
    baseUrl: "https://github.dev/",
  },
  {
    title: "VSCode Dev",
    baseUrl: "https://vscode.dev/github/",
  },
  {
    title: "CodeSandbox",
    baseUrl: `https://codesandbox.io/s/github/`,
  },
  {
    title: "Repl.it",
    baseUrl: `https://repl.it/github/`,
  },
  {
    title: "Gitpod",
    baseUrl: `https://gitpod.io/#https://github.com/`,
  },
  {
    title: "Glitch",
    baseUrl: "https://glitch.com/edit/#!/import/github/",
  },
  {
    title: "Sourcegraph",
    baseUrl: `https://sourcegraph.com/github.com/`,
  },
  {
    title: "VSCode Remote Repositories",
    baseUrl: "vscode://GitHub.remotehub/open?url=https://github.com/",
    icon: "vscode-action-icon.png",
  },
];

export function OpenInWebIDEAction(props: { repository: Repository; onOpen: () => void }) {
  const { repository, onOpen } = props;
  return (
    <ActionPanel.Submenu icon={Icon.Globe} title="Open in">
      {WebIdes.map((ide) => (
        <Action.OpenInBrowser
          title={ide.title}
          icon={ide.icon || { source: `https://www.google.com/s2/favicons?domain=${ide.baseUrl}&sz=${64}` }}
          key={ide.title}
          url={ide.baseUrl + repository.nameWithOwner}
          onOpen={onOpen}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
