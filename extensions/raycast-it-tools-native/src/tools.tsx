import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { ToolsDateTimeView } from "./tools-date-time";
import { ToolsHashTextView } from "./tools-hash-text";
import { ToolsJsonView } from "./tools-json";

type ToolItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: Icon;
  keywords: string[];
  push: () => void;
};

export default function Command() {
  const { push } = useNavigation();

  const tools: ToolItem[] = [
    {
      id: "date-time",
      title: "Date Time",
      subtitle: "Timestamp/date convert and timezone display",
      icon: Icon.Clock,
      keywords: ["date", "time", "timestamp", "unix", "utc"],
      push: () => push(<ToolsDateTimeView />),
    },
    {
      id: "json",
      title: "JSON Stringify Decode",
      subtitle: "Pretty, minify, stringify, and decode",
      icon: Icon.Code,
      keywords: ["json", "pretty", "minify", "stringify", "decode"],
      push: () => push(<ToolsJsonView />),
    },
    {
      id: "hash-text",
      title: "Hash Text",
      subtitle: "MD5 / SHA-1 / SHA-256 / SHA-512",
      icon: Icon.Hashtag,
      keywords: ["hash", "sha256", "sha512", "md5", "digest"],
      push: () => push(<ToolsHashTextView />),
    },
  ];

  return (
    <List navigationTitle="Tools" searchBarPlaceholder="Search tools...">
      <List.Section title="Core Tools">
        {tools.map((tool) => (
          <List.Item
            key={tool.id}
            title={tool.title}
            subtitle={tool.subtitle}
            icon={tool.icon}
            keywords={tool.keywords}
            actions={
              <ActionPanel>
                <Action
                  title="Open Tool"
                  icon={Icon.ArrowRight}
                  onAction={tool.push}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
