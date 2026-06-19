import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { scan, getAllAssets, getStats } from "./scanner";
import { Asset, AssetType, ScanResult, PROVIDERS, TYPE_LABELS } from "./types";
import { homedir } from "os";

const HOME = homedir();

function providerAccessories(asset: Asset): List.Item.Accessory[] {
  const primary = asset.providers[0];
  const info = PROVIDERS[primary];
  const result: List.Item.Accessory[] = [
    { tag: { value: info.name, color: info.color as Color } },
  ];
  if (asset.providers.length > 1) {
    result.push({
      text: {
        value: `+${asset.providers.length - 1}`,
        color: Color.SecondaryText,
      },
    });
  }
  return result;
}

function typeIcon(type: AssetType): Icon {
  switch (type) {
    case "skill":
      return Icon.Terminal;
    case "agent":
      return Icon.Person;
    case "mcp":
      return Icon.Globe;
    case "instruction":
      return Icon.Document;
    case "rule":
      return Icon.Shield;
  }
}

function shortPath(filePath: string): string {
  return filePath.replace(HOME, "~");
}

function assetDetail(asset: Asset): string {
  const lines = [
    `# ${asset.name}`,
    "",
    `**Type:** ${TYPE_LABELS[asset.type]}`,
    `**Providers:** ${asset.providers.map((p) => PROVIDERS[p].name).join(", ")}`,
    `**Path:** \`${shortPath(asset.filePath)}\``,
  ];

  if (asset.transport) lines.push(`**Transport:** ${asset.transport}`);
  if (asset.command) lines.push(`**Command:** \`${asset.command}\``);
  if (asset.desc) {
    lines.push("", "---", "", asset.desc);
  }

  return lines.join("\n");
}

function AssetItem({ asset, idx }: { asset: Asset; idx: number }) {
  return (
    <List.Item
      key={`${asset.type}-${asset.name}-${idx}`}
      icon={{
        source: typeIcon(asset.type),
        tintColor: PROVIDERS[asset.providers[0]]?.color,
      }}
      title={asset.name}
      subtitle={
        asset.desc.length > 60
          ? asset.desc.substring(0, 57) + "..."
          : asset.desc
      }
      accessories={providerAccessories(asset)}
      detail={<List.Item.Detail markdown={assetDetail(asset)} />}
      actions={
        <ActionPanel>
          <Action.Open title="Open File" target={asset.filePath} />
          <Action.CopyToClipboard
            title="Copy Path"
            content={asset.filePath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={asset.name}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action.ShowInFinder
            path={asset.filePath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
        </ActionPanel>
      }
    />
  );
}

interface AssetListProps {
  filter?: AssetType | AssetType[];
  placeholder?: string;
  groupByTransport?: boolean;
}

export default function AssetList({
  filter,
  placeholder,
  groupByTransport,
}: AssetListProps) {
  const { data, isLoading } = useCachedPromise(async () => scan(), [], {
    keepPreviousData: true,
  });

  const types = filter
    ? Array.isArray(filter)
      ? filter
      : [filter]
    : undefined;

  const assets = data ? getAssets(data, types) : [];
  const stats = data ? getStats(data) : null;

  const defaultPlaceholder = types
    ? `Search ${types.map((t) => TYPE_LABELS[t] + "s").join(", ")}...`
    : stats
      ? `${stats.total} assets across ${stats.providers} providers`
      : "Scanning...";

  if (groupByTransport) {
    const byTransport = new Map<string, Asset[]>();
    for (const a of assets) {
      const t = a.transport || "stdio";
      const list = byTransport.get(t) || [];
      list.push(a);
      byTransport.set(t, list);
    }
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={placeholder || defaultPlaceholder}
        isShowingDetail
      >
        {Array.from(byTransport.entries()).map(([transport, items]) => (
          <List.Section
            key={transport}
            title={transport.toUpperCase()}
            subtitle={`${items.length}`}
          >
            {items.map((asset, idx) => (
              <AssetItem key={`${asset.name}-${idx}`} asset={asset} idx={idx} />
            ))}
          </List.Section>
        ))}
      </List>
    );
  }

  // Group by type when showing all
  if (!types || types.length > 1) {
    const grouped = new Map<AssetType, Asset[]>();
    for (const asset of assets) {
      const list = grouped.get(asset.type) || [];
      list.push(asset);
      grouped.set(asset.type, list);
    }
    const sectionOrder: AssetType[] = [
      "skill",
      "agent",
      "mcp",
      "rule",
      "instruction",
    ];
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={placeholder || defaultPlaceholder}
        isShowingDetail
      >
        {sectionOrder.map((type) => {
          const items = grouped.get(type);
          if (!items || items.length === 0) return null;
          return (
            <List.Section
              key={type}
              title={`${TYPE_LABELS[type]}s`}
              subtitle={`${items.length}`}
            >
              {items.map((asset, idx) => (
                <AssetItem
                  key={`${asset.name}-${idx}`}
                  asset={asset}
                  idx={idx}
                />
              ))}
            </List.Section>
          );
        })}
      </List>
    );
  }

  // Single type — flat list
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={placeholder || defaultPlaceholder}
      isShowingDetail
    >
      {assets.map((asset, idx) => (
        <AssetItem key={`${asset.name}-${idx}`} asset={asset} idx={idx} />
      ))}
    </List>
  );
}

function getAssets(result: ScanResult, types?: AssetType[]): Asset[] {
  if (!types) return getAllAssets(result);
  const all = getAllAssets(result);
  return all.filter((a) => types.includes(a.type));
}
