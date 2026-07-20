import { List } from "@raycast/api";
import { ToolItem } from "./ToolItem";
import { Tool } from "../data/tools";

export function ToolSection({ section, tools }: { section: string; tools: Tool[] }) {
  return (
    <List.Section title={section}>
      {tools.map((tool) => (
        <ToolItem key={tool.name} tool={tool} />
      ))}
    </List.Section>
  );
}
