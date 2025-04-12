import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { getBlocks, getInstallCommand } from "../data/blocks";
import { useLocalStorage } from "@raycast/utils";
import { managerType } from "./set-install";
import { useEffect, useState } from "react";

export default function Command() {
  const { value: activeManager } = useLocalStorage<managerType>("manager", "npm");
  const [blocks, setBlocks] = useState<ReturnType<typeof getBlocks>>(getBlocks());

  useEffect(() => {
    setBlocks(getBlocks());
  }, [activeManager]);

  return (
    <List isLoading={false}>
      {blocks.map((item) => (
        <List.Item
          key={item.name}
          icon={Icon.Box}
          title={item.name}
          subtitle={item.description}
          accessories={[
            item.example ? { icon: Icon.CodeBlock } : {},
            item.api || item.docs ? { icon: Icon.List } : {},
            item.setup ? { tag: "Requires Setup" } : {},
          ]}
          actions={
            <ActionPanel>
              {!item.setup && (
                <Action.CopyToClipboard
                  content={getInstallCommand(activeManager, item.component)}
                  title={"Copy Install Code"}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              )}
              <Action.OpenInBrowser
                url={item.url}
                title={"Open URL"}
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              {item.example && (
                <Action.CopyToClipboard
                  content={item.example}
                  title={"Copy Example Code"}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
              )}
              {item.docs && (
                <Action.OpenInBrowser
                  url={item.docs}
                  title={"Open Docs"}
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd"], key: "[" }}
                />
              )}
              {item.api && (
                <Action.OpenInBrowser
                  url={item.api}
                  title={"Open Api Reference"}
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd"], key: "]" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
