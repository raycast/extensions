import { List } from "@raycast/api";
import { tools } from "./data/tools";
import { ToolSection } from "./components/ToolSection";

export default function Command() {
  const sections = Array.from(new Set(tools.map((tool) => tool.section)));

  return (
    <List>
      {sections.map((section) => (
        <ToolSection key={section} section={section} tools={tools.filter((t) => t.section === section)} />
      ))}
    </List>
  );
}
