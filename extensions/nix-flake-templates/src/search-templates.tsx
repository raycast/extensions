import { Action, ActionPanel, Application, getFrontmostApplication, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatTitle } from "./utils";
import { useFlakeTemplates } from "./hooks";

function toMarkdown(template: string): string {
  return `\`\`\`nix\n${template}\n\`\`\``;
}

export default function Command() {
  const [{ flakeTemplates, isLoading }, refresh] = useFlakeTemplates();
  const [frontmostApp, setFrontmostApp] = useState<Application>();

  useEffect(() => {
    getFrontmostApplication().then(setFrontmostApp);
  }, []);

  return (
    <List isShowingDetail isLoading={isLoading}>
      {flakeTemplates.map((t) => {
        return (
          <List.Item
            key={t.lang}
            title={formatTitle(t.lang)}
            detail={<List.Item.Detail markdown={toMarkdown(t.content)} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard content={t.content} />
                  {frontmostApp && (
                    <Action.Paste
                      title={`Paste to ${frontmostApp.name}`}
                      icon={{ fileIcon: frontmostApp.path }}
                      content={t.content}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                    icon={Icon.ArrowClockwise}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
