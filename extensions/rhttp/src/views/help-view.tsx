import { ActionPanel, Detail, List, environment } from "@raycast/api";
import { parseHelpMarkdown } from "~/utils/markdown-parser";
import fs from "fs";
import path from "path";
import { GlobalActions } from "~/components/actions";

export function HelpView() {
  // Read from assets directory
  let helpContent: string;
  try {
    helpContent = fs.readFileSync(path.join(environment.assetsPath, "help.md"), "utf-8");
  } catch {
    return <Detail markdown="# Help\nHelp documentation not found." />;
  }

  const sections = parseHelpMarkdown(helpContent);

  return (
    <List
      navigationTitle="Help & Documentation"
      isShowingDetail
      actions={
        <ActionPanel>
          <GlobalActions />
        </ActionPanel>
      }
    >
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Item
              key={item.title}
              title={item.title}
              detail={<List.Item.Detail markdown={`## ${item.title}\n${item.content}`} />}
              actions={
                <ActionPanel>
                  <GlobalActions />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
