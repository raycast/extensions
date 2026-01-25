import { Action, ActionPanel, Color, List, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS } from "../constants";
import { Registry } from "../search-registries";

interface RegistryDetail {
  name: string;
  homepage: string;
  items: RegistryItem[];
}

interface RegistryItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: Array<{
    type: string;
    content?: string;
    path?: string;
  }>;
}

/**
 * Get color for registry item type
 */
function getTypeColor(type: string): Color {
  switch (type) {
    case "registry:block":
      return Color.Blue;
    case "registry:component":
      return Color.Green;
    case "registry:lib":
      return Color.Purple;
    case "registry:hook":
      return Color.Yellow;
    case "registry:ui":
      return Color.Blue;
    case "registry:page":
      return Color.Orange;
    case "registry:file":
      return Color.SecondaryText;
    case "registry:style":
      return Color.Purple;
    case "registry:theme":
      return Color.Orange;
    case "registry:item":
      return Color.SecondaryText;
    default:
      return Color.SecondaryText;
  }
}

/**
 * Fetch registry detail from a registry's URL template
 * Replaces {name} with "registry" in the URL template
 * Example: "https://8bitcn.com/r/{name}.json" -> "https://8bitcn.com/r/registry.json"
 */
async function fetchRegistryDetail(urlTemplate: string): Promise<RegistryDetail> {
  const registryUrl = urlTemplate.replace("{name}", "registry");
  const response = await fetch(registryUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry: ${response.statusText}`);
  }
  const data = (await response.json()) as RegistryDetail;
  return data;
}

export function RegistryItemsList({ registry }: { registry: Registry }) {
  const { isLoading, data } = useCachedPromise(fetchRegistryDetail, [registry.url], {
    keepPreviousData: true,
    onError: async (e) => {
      await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search components in ${registry.name}...`}
      navigationTitle={data?.name || registry.name}
      isShowingDetail
    >
      {!data || data.items.length === 0 ? (
        <List.EmptyView
          title="No components found"
          description={isLoading ? "Loading..." : "This registry has no items."}
        />
      ) : (
        data.items.map((item, index) => (
          <RegistryItemListItem key={`${item.name}-${index}`} item={item} registry={registry} />
        ))
      )}
    </List>
  );
}

function RegistryItemListItem({ item, registry }: { item: RegistryItem; registry: Registry }) {
  const hasMetadata =
    item.type ||
    (item.dependencies && item.dependencies.length > 0) ||
    (item.registryDependencies && item.registryDependencies.length > 0);

  return (
    <List.Item
      title={item.title || item.name}
      detail={
        <List.Item.Detail
          markdown={
            item.description ? `# ${item.title || item.name}\n\n${item.description}` : `# ${item.title || item.name}`
          }
          metadata={
            hasMetadata && (
              <List.Item.Detail.Metadata>
                {item.type && (
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={item.type} color={getTypeColor(item.type)} />
                  </List.Item.Detail.Metadata.TagList>
                )}
                {item.dependencies && item.dependencies.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Dependencies" text={item.dependencies.join(", ")} />
                  </>
                )}
                {item.registryDependencies && item.registryDependencies.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Registry Dependencies"
                      text={item.registryDependencies.join(", ")}
                    />
                  </>
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon="npm-icon.png"
              title="Copy Add Component [Npm]"
              content={`npx shadcn@latest add ${registry.name}/${item.name}`}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.CopyToClipboard
              icon="pnpm-icon.png"
              title="Copy Add Component [Pnpm]"
              content={`pnpm dlx shadcn@latest add ${registry.name}/${item.name}`}
              shortcut={{ modifiers: ["cmd", "ctrl"], key: "p" }}
            />
            <Action.CopyToClipboard
              icon="yarn-icon.png"
              title="Copy Add Component [Yarn]"
              content={`yarn shadcn@latest add ${registry.name}/${item.name}`}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
            <Action.CopyToClipboard
              icon="bun-icon.png"
              title="Copy Add Component [Bun]"
              content={`bunx --bun shadcn@latest add ${registry.name}/${item.name}`}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
