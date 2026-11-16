import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ToolForm } from "./components/ToolForm";
import { listTools, STORE_URL, Tool, ToolboxError } from "./lib/toolbox";

const SECTIONS: { title: string; icon: Icon; match: RegExp }[] = [
  { title: "Video", icon: Icon.Video, match: /video|gif|frames|download/ },
  { title: "Audio", icon: Icon.Music, match: /audio|transcribe|media_info/ },
  { title: "PDF", icon: Icon.Document, match: /pdf|markdown|word/ },
  { title: "Images", icon: Icon.Image, match: /image|watermark/ },
  { title: "Text", icon: Icon.Text, match: /text/ },
];

const sectionOf = (tool: Tool) => SECTIONS.find((s) => s.match.test(tool.name)) ?? { title: "More", icon: Icon.Hammer };

export default function SearchTools() {
  const { data, isLoading, error } = usePromise(listTools);

  if (error) {
    const missing = error instanceof ToolboxError && error.kind === "missing";
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title={missing ? "Toolbox isn't installed" : "Couldn't read Toolbox's tools"}
          description={
            missing
              ? "Toolbox is a Mac app with 100+ file tools. Pay once, everything runs on your Mac."
              : error.message
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Toolbox" url={STORE_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const grouped = new Map<string, { icon: Icon; tools: Tool[] }>(
    [...SECTIONS, { title: "More", icon: Icon.Hammer }].map((s) => [s.title, { icon: s.icon, tools: [] as Tool[] }]),
  );
  for (const tool of data ?? []) {
    const section = sectionOf(tool);
    grouped.get(section.title)!.tools.push(tool);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tools: compress, PDF, background, transcribe…">
      {[...grouped]
        .filter(([, g]) => g.tools.length)
        .map(([title, { icon, tools }]) => (
          <List.Section key={title} title={title}>
            {tools.map((tool) => (
              <List.Item
                key={tool.name}
                icon={icon}
                title={tool.title}
                subtitle={tool.description.split(". ")[0].replace(/\.$/, "")}
                keywords={[tool.name.replace(/_/g, " "), ...tool.description.toLowerCase().split(/\W+/).slice(0, 25)]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Choose Files and Options"
                      icon={Icon.Play}
                      target={<ToolForm tool={tool} title={tool.title} />}
                    />
                    <Action.CopyToClipboard
                      title="Copy Command-Line Name"
                      content={`toolbox ${tool.name.replace(/_/g, "-")}`}
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
