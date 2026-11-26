import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  BUNDLED_TOOLS,
  CATALOGUE_URL,
  categoriesOf,
  parseCatalogue,
  searchKeywords,
  type SiteTool,
} from "./lib/site-tools";
import { shortcut } from "./lib/shortcuts";

const ALL = "all";

export default function SearchTools() {
  const [category, setCategory] = useState<string>(ALL);

  // The bundled list shows at once; the live one replaces it when it arrives.
  // A failed refresh is not worth a toast: the bundled list is still correct,
  // just possibly a few tools short.
  const { data, isLoading } = useFetch<unknown, SiteTool[], SiteTool[]>(CATALOGUE_URL, {
    parseResponse: async (response) => {
      if (!response.ok) throw new Error(`redbison.dev answered ${response.status}`);
      return response.json();
    },
    mapResult: (json) => ({ data: parseCatalogue(json) }),
    initialData: BUNDLED_TOOLS,
    keepPreviousData: true,
    onError: () => undefined,
  });

  const tools = data ?? BUNDLED_TOOLS;
  const categories = useMemo(() => categoriesOf(tools), [tools]);
  const shown = category === ALL ? tools : tools.filter((t) => t.category === category);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${tools.length} RedBison tools`}
      searchBarAccessory={
        <List.Dropdown tooltip="Category" storeValue onChange={setCategory}>
          <List.Dropdown.Item title="All Categories" value={ALL} />
          {categories.map((c) => (
            <List.Dropdown.Item key={c} title={c} value={c} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Matching Tools"
        description="Try fewer words, or search redbison.dev directly."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open RedBison" url="https://redbison.dev" />
          </ActionPanel>
        }
      />
      {shown.map((tool) => (
        <ToolItem key={tool.id} tool={tool} />
      ))}
    </List>
  );
}

function ToolItem({ tool }: { tool: SiteTool }) {
  return (
    <List.Item
      title={tool.name}
      subtitle={tool.description}
      keywords={searchKeywords(tool)}
      accessories={[{ tag: tool.subcategory || tool.category, tooltip: tool.category }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={tool.url} />
            <Action.CopyToClipboard title="Copy URL" content={tool.url} />
            <Action.CopyToClipboard
              title="Copy Markdown Link"
              content={`[${tool.name}](${tool.url})`}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          {tool.guide ? (
            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open Guide" icon={Icon.Book} url={tool.guide} shortcut={shortcut("g")} />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
