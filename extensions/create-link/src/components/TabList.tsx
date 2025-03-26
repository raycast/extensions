import { List, BrowserExtension, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useState } from "react";
import { generateHTML, generateMarkdown, generateCustomTemplate } from "../utils/formatter";

export default function TabList({ tabs }: { tabs: BrowserExtension.Tab[] }) {
  const domains = [...new Set(tabs.map((tab) => new URL(tab.url).hostname))];
  const [selectedDomain, setSelectedDomain] = useState("");

  const filteredTabs = selectedDomain ? tabs.filter((tab) => new URL(tab.url).hostname === selectedDomain) : tabs;
  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Dropdown With Items"
          defaultValue=""
          onChange={setSelectedDomain}
          value={selectedDomain}
        >
          {[
            <List.Dropdown.Item key="all" title="All" value="" />,
            ...domains.map((domain) => <List.Dropdown.Item key={domain} title={domain} value={domain} />),
          ]}
        </List.Dropdown>
      }
    >
      {filteredTabs.map((tab) => (
        <List.Item
          key={tab.id}
          icon={{
            source: tab.favicon || Icon.Link,
            fallback: Icon.Link,
          }}
          title={tab.title || ""}
          subtitle={tab.url}
          accessories={tab.active ? [{ text: { value: "Active", color: Color.Green } }] : []}
          actions={
            <ActionPanel title={"Copy Action"}>
              <Action.CopyToClipboard
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Copy as HTML"
                content={generateHTML(tab.title || "", tab.url)}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                title="Copy as Markdown"
                content={generateMarkdown(tab.title || "", tab.url)}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                title="Copy as Plain Text"
                content={tab.url}
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                title="Copy as Custom"
                content={generateCustomTemplate(tab)}
                shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
                icon={Icon.TextCursor}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
