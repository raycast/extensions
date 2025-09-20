import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { prismaSections, prismaCommands } from "./data";

export default function Command() {
  return (
    <List>
      {prismaSections.map(({ icon, title, subtitle, category, tintColor }) => (
        <List.Section key={title} title={title} subtitle={subtitle}>
          {prismaCommands
            .filter((command) => command.category === category)
            .map(({ title, subtitle, copyToClipboard, detailsMarkdown }, index) => (
              <List.Item
                key={index}
                title={title}
                subtitle={subtitle}
                icon={{ source: icon, tintColor }}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={copyToClipboard} />
                    <Action.CopyToClipboard
                      title="Copy with NPM Prefix"
                      icon={Icon.CopyClipboard}
                      content={`npx ${copyToClipboard}`}
                      shortcut={{ modifiers: ["opt"], key: "n" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy with Yarn Prefix"
                      icon={Icon.CopyClipboard}
                      content={`yarn ${copyToClipboard}`}
                      shortcut={{ modifiers: ["opt"], key: "y" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy with PNPM Prefix"
                      icon={Icon.CopyClipboard}
                      content={`pnpm dlx ${copyToClipboard}`}
                      shortcut={{ modifiers: ["opt"], key: "p" }}
                    />
                    <Action.Push
                      icon={Icon.Paragraph}
                      title="Show Details"
                      shortcut={{ modifiers: ["opt"], key: "return" }}
                      target={<Detail markdown={detailsMarkdown} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
