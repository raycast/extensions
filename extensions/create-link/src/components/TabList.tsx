import { List, BrowserExtension, Color, Icon, Action, ActionPanel, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { generateHTML, generateMarkdown, generateCustomTemplate } from "../utils/formatter";

interface defaultCopyActionPreferences {
  defaultCopyFormat: "html" | "markdown" | "plaintext" | "custom";
}
type CopyFormatType = defaultCopyActionPreferences["defaultCopyFormat"];

export default function TabList({ tabs }: { tabs: BrowserExtension.Tab[] }) {
  const domains = [...new Set(tabs.map((tab) => new URL(tab.url).hostname))];
  const [selectedDomain, setSelectedDomain] = useState("");
  const defaultCopyAction = getPreferenceValues<defaultCopyActionPreferences>().defaultCopyFormat;

  const getCopyText = (format: CopyFormatType, tab: BrowserExtension.Tab) => {
    switch (format) {
      case "html":
        return generateHTML(tab);
      case "markdown":
        return generateMarkdown(tab);
      case "plaintext":
        return tab.url;
      case "custom":
        return generateCustomTemplate(tab);
      default:
        console.debug("Unknown defaultCopyAction: " + format);
        return tab.url;
    }
  };

  const filteredTabs = selectedDomain ? tabs.filter((tab) => new URL(tab.url).hostname === selectedDomain) : tabs;
  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter tabs by domain"
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
                title={`Copy as ${defaultCopyAction}`}
                content={getCopyText(defaultCopyAction, tab)}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Copy as HTML"
                content={getCopyText("html", tab)}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                title="Copy as Markdown"
                content={getCopyText("markdown", tab)}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                title="Copy as Plain Text"
                content={getCopyText("plaintext", tab)}
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                icon={Icon.TextCursor}
              />
              <Action.CopyToClipboard
                title="Copy as Custom"
                content={getCopyText("custom", tab)}
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
