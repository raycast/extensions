import { Action, ActionPanel, Icon, List } from "@raycast/api";
import DocsDetail from "./DocsDetail";
import { Documentation } from "../types";

type DocsListItemProps = {
  doc: Documentation;
};

export default function DocsListItem({ doc }: DocsListItemProps) {
  const markdown = doc.documentation || "No documentation available.";
  return (
    <List.Item
      key={doc.module + doc.name}
      title={doc.name}
      subtitle={doc.module}
      keywords={keywords(doc.module, doc.name)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Docs"
            icon={Icon.AppWindowSidebarLeft}
            target={<DocsDetail name={`${doc.module}.${doc.name}`} markdown={markdown} url={doc.url} />}
          />
          <Action.OpenInBrowser title="Open in Browser" url={doc.url} />
          <Action.CopyToClipboard
            title="Copy Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            content={doc.url}
          />
        </ActionPanel>
      }
    />
  );
}

function keywords(module: string, name: string) {
  const parts: string[] = module.split("/");
  const last = parts[parts.length - 1];

  return [module, last, `${module}.${name}`, `${last}.${name}`];
}
