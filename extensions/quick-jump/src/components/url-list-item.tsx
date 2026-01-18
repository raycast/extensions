import { Action, ActionPanel, Application, List, Detail, Icon } from "@raycast/api";
import { DisplayUrl } from "../types";
import { OpenConfigFileAction } from "./open-config-action";
import { getTagAccessories, getFallbackIcon, getAppIcon } from "../utils";

interface URLListItemProps {
  item: DisplayUrl;
  applications: Application[];
}

function URLDetailView({ item, applications }: { item: DisplayUrl; applications: Application[] }) {
  const markdownParts = [`# ${item.title}`, ``, `---`, ``];

  // URL Section
  markdownParts.push(`### URL`);
  markdownParts.push(`\`\`\``, item.url, `\`\`\``);
  markdownParts.push(``);

  // Application Section
  if (item.openIn) {
    markdownParts.push(`### Application`);
    markdownParts.push(`**Opens in:** ${item.openIn}`);
    markdownParts.push(``);
  }

  // Tags Section
  if (item.tags && item.tags.length > 0) {
    markdownParts.push(`### Tags`);
    markdownParts.push(item.tags.map((tag) => `\`${tag}\``).join(" • "));
    markdownParts.push(``);
  }

  // Keywords Section (for debugging/info)
  if (item.keywords && item.keywords.length > 0) {
    markdownParts.push(`### Search Keywords`);
    markdownParts.push(
      `> ${item.keywords.slice(0, 10).join(", ")}${item.keywords.length > 10 ? `, ... (${item.keywords.length - 10} more)` : ""}`,
    );
    markdownParts.push(``);
  }

  const markdown = markdownParts.join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {item.openIn ? (
            <Action.Open
              title={`Open in ${item.openIn}`}
              target={item.url}
              application={item.openIn}
              icon={getAppIcon(item.openIn, applications) || Icon.AppWindow}
            />
          ) : (
            <Action.OpenInBrowser url={item.url} />
          )}
          <Action.CopyToClipboard content={item.url} title="Copy URL" />
          <ActionPanel.Section>
            <OpenConfigFileAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function URLListItem({ item, applications }: URLListItemProps) {
  const icon =
    item.icon || (item.openIn ? getAppIcon(item.openIn, applications) : undefined) || getFallbackIcon(undefined, false);

  const tags = item.tags || [];
  const accessories = getTagAccessories(tags);

  return (
    <List.Item
      key={item.key}
      title={item.title}
      icon={icon}
      keywords={item.keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          {item.openIn ? (
            <Action.Open
              title={`Open in ${item.openIn}`}
              target={item.url}
              application={item.openIn}
              icon={getAppIcon(item.openIn, applications) || Icon.AppWindow}
            />
          ) : (
            <Action.OpenInBrowser url={item.url} />
          )}
          <Action.CopyToClipboard content={item.url} />
          <Action.Push
            title="Show Details"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<URLDetailView item={item} applications={applications} />}
          />
          <ActionPanel.Section>
            <OpenConfigFileAction shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
