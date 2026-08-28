import { useEffect, useState, useCallback, useRef } from "react";
import { List, Icon, showToast, Toast, ActionPanel, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getSearchAttributes,
  listNamespaces,
  showConnectionError,
  setCurrentNamespace,
  setCurrentCluster,
  getClusters,
} from "./lib/temporal-client";
import { NamespaceInfo, ClusterConfig } from "./lib/types";
import { getSelectedNamespace, setSelectedNamespace, getSelectedCluster, setSelectedCluster } from "./lib/storage";

interface SearchAttribute {
  name: string;
  type: string;
}

const TYPE_COLORS: Record<string, Color> = {
  KEYWORD: Color.Blue,
  TEXT: Color.Green,
  INT: Color.Orange,
  DOUBLE: Color.Orange,
  BOOL: Color.Purple,
  DATETIME: Color.Magenta,
  KEYWORD_LIST: Color.Blue,
};

const TYPE_ICONS: Record<string, Icon> = {
  KEYWORD: Icon.Tag,
  TEXT: Icon.Text,
  INT: Icon.Hashtag,
  DOUBLE: Icon.Hashtag,
  BOOL: Icon.CheckCircle,
  DATETIME: Icon.Calendar,
  KEYWORD_LIST: Icon.List,
};

export default function SearchAttributes() {
  const [selectedClusterName, setSelectedClusterName] = useState<string>("");
  const [selectedNamespace, setSelectedNamespaceState] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "system" | "custom">("all");
  const isInitializedRef = useRef(false);

  // Load clusters from storage
  const { data: clusters = [], isLoading: clustersLoading } = useCachedPromise(getClusters, [], {
    keepPreviousData: true,
  });

  // Initialize cluster and namespace from storage (only once)
  useEffect(() => {
    if (clusters.length === 0 || isInitializedRef.current) return;
    isInitializedRef.current = true;

    async function init() {
      const storedCluster = await getSelectedCluster();
      const clusterName =
        storedCluster && clusters.find((c) => c.name === storedCluster) ? storedCluster : clusters[0]?.name || "Local";

      const cluster = clusters.find((c) => c.name === clusterName) || clusters[0];
      setSelectedClusterName(clusterName);
      setCurrentCluster(cluster);

      const storedNamespace = await getSelectedNamespace();
      const ns = storedNamespace || cluster?.namespace || "default";
      setSelectedNamespaceState(ns);
      setCurrentNamespace(ns);
    }
    init();
  }, [clusters]);

  // Fetch namespaces for selected cluster
  const { data: namespaces, isLoading: namespacesLoading } = useCachedPromise(
    async (clusterName: string) => {
      if (!clusterName) return [];
      try {
        return await listNamespaces();
      } catch {
        const cluster = clusters.find((c) => c.name === clusterName);
        return [{ name: cluster?.namespace || "default", state: "Registered" }] as NamespaceInfo[];
      }
    },
    [selectedClusterName],
    { keepPreviousData: true }
  );

  // Handle cluster change
  const handleClusterChange = useCallback(
    (clusterName: string) => {
      try {
        const cluster = clusters.find((c) => c.name === clusterName);
        if (!cluster) return;

        const ns = cluster.namespace || "default";

        // Update React state
        setSelectedClusterName(clusterName);
        setSelectedNamespaceState(ns);

        // Set module-level state
        setCurrentCluster(cluster);
        setCurrentNamespace(ns);

        // Persist to storage (fire and forget)
        setSelectedCluster(clusterName);
        setSelectedNamespace(ns);

        showToast({
          style: Toast.Style.Success,
          title: "Cluster Changed",
          message: `${clusterName} / ${ns}`,
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to switch cluster",
          message: String(error),
        });
      }
    },
    [clusters]
  );

  // Handle namespace change
  const handleNamespaceChange = useCallback(async (namespace: string) => {
    setSelectedNamespaceState(namespace);
    setCurrentNamespace(namespace);
    await setSelectedNamespace(namespace);
    await showToast({
      style: Toast.Style.Success,
      title: "Namespace Changed",
      message: namespace,
    });
  }, []);

  // Fetch search attributes
  const {
    data: attributes,
    isLoading: attributesLoading,
    revalidate,
  } = useCachedPromise(
    async (namespace: string, clusterName: string) => {
      if (!namespace || !clusterName) return null;
      return getSearchAttributes();
    },
    [selectedNamespace, selectedClusterName],
    {
      keepPreviousData: true,
      onError: showConnectionError,
    }
  );

  const isLoading =
    clustersLoading || attributesLoading || namespacesLoading || !selectedNamespace || !selectedClusterName;

  const systemAttrs = attributes?.system || [];
  const customAttrs = attributes?.custom || [];

  const showSystem = filter === "all" || filter === "system";
  const showCustom = filter === "all" || filter === "custom";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search attributes..."
      searchBarAccessory={
        <AttributesDropdown
          clusters={clusters}
          selectedCluster={selectedClusterName}
          namespaces={namespaces || []}
          selectedNamespace={selectedNamespace}
          filter={filter}
          onClusterChange={handleClusterChange}
          onNamespaceChange={handleNamespaceChange}
          onFilterChange={setFilter}
        />
      }
    >
      {showSystem && systemAttrs.length > 0 && (
        <List.Section title="System Attributes" subtitle={String(systemAttrs.length)}>
          {systemAttrs.map((attr) => (
            <AttributeItem key={attr.name} attribute={attr} isSystem onRefresh={revalidate} />
          ))}
        </List.Section>
      )}

      {showCustom && customAttrs.length > 0 && (
        <List.Section title="Custom Attributes" subtitle={String(customAttrs.length)}>
          {customAttrs.map((attr) => (
            <AttributeItem key={attr.name} attribute={attr} isSystem={false} onRefresh={revalidate} />
          ))}
        </List.Section>
      )}

      {showCustom && customAttrs.length === 0 && !isLoading && (
        <List.Section title="Custom Attributes">
          {clusters.find((c) => c.name === selectedClusterName)?.connectionType === "cloud" ? (
            <List.Item
              title="Custom Attributes Not Available"
              subtitle="Cannot be discovered with namespace-scoped API keys"
              icon={Icon.Info}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="View in Temporal Cloud" url="https://cloud.temporal.io" />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="No Custom Attributes"
              subtitle="Add custom search attributes via temporal CLI"
              icon={Icon.Info}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Add Attribute Command"
                    content={`temporal operator search-attribute create --namespace "${selectedNamespace}" --name "CustomAttribute" --type "Keyword"`}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}

// ============================================================================
// Components
// ============================================================================

interface AttributesDropdownProps {
  clusters: ClusterConfig[];
  selectedCluster: string;
  namespaces: NamespaceInfo[];
  selectedNamespace: string;
  filter: "all" | "system" | "custom";
  onClusterChange: (clusterName: string) => void;
  onNamespaceChange: (namespace: string) => void;
  onFilterChange: (filter: "all" | "system" | "custom") => void;
}

function AttributesDropdown({
  clusters,
  selectedCluster,
  namespaces,
  selectedNamespace,
  filter,
  onClusterChange,
  onNamespaceChange,
  onFilterChange,
}: AttributesDropdownProps) {
  const combinedValue = `${selectedCluster}|${selectedNamespace}|${filter}`;

  const handleChange = (value: string) => {
    const [cluster, ns, f] = value.split("|");
    if (cluster !== selectedCluster) {
      onClusterChange(cluster);
      return;
    }
    if (ns !== selectedNamespace) {
      onNamespaceChange(ns);
    }
    if (f !== filter) {
      onFilterChange(f as "all" | "system" | "custom");
    }
  };

  const filters = [
    { value: "all", title: "All Attributes" },
    { value: "system", title: "System Only" },
    { value: "custom", title: "Custom Only" },
  ];

  const hasMultipleClusters = clusters.length > 1;

  // Ensure we have at least the selected namespace in the list
  const effectiveNamespaces = (() => {
    if (namespaces.length === 0) {
      const cluster = clusters.find((c) => c.name === selectedCluster);
      return [
        {
          name: cluster?.namespace || selectedNamespace || "default",
          state: "Registered",
        } as NamespaceInfo,
      ];
    }
    const nsSet = new Set(namespaces.map((ns) => ns.name));
    if (selectedNamespace && !nsSet.has(selectedNamespace)) {
      return [{ name: selectedNamespace, state: "Registered" } as NamespaceInfo, ...namespaces];
    }
    return namespaces;
  })();

  if (hasMultipleClusters) {
    return (
      <List.Dropdown tooltip="Cluster / Namespace / Filter" value={combinedValue} onChange={handleChange}>
        {/* Current cluster section */}
        <List.Dropdown.Section title={`📍 ${selectedCluster}`}>
          {effectiveNamespaces.flatMap((ns) =>
            filters.map((f) => (
              <List.Dropdown.Item
                key={`${selectedCluster}-${ns.name}-${f.value}`}
                title={`${ns.name} / ${f.title}`}
                value={`${selectedCluster}|${ns.name}|${f.value}`}
              />
            ))
          )}
        </List.Dropdown.Section>

        {/* Other clusters */}
        {clusters
          .filter((c) => c.name !== selectedCluster)
          .map((cluster) => (
            <List.Dropdown.Section key={`section-${cluster.name}`} title={`📍 ${cluster.name}`}>
              <List.Dropdown.Item
                key={`switch-${cluster.name}`}
                title={`Switch to ${cluster.name}`}
                value={`${cluster.name}|${cluster.namespace}|all`}
              />
            </List.Dropdown.Section>
          ))}
      </List.Dropdown>
    );
  }

  return (
    <List.Dropdown tooltip="Namespace & Filter" value={combinedValue} onChange={handleChange}>
      {effectiveNamespaces.flatMap((ns) =>
        filters.map((f) => (
          <List.Dropdown.Item
            key={`${selectedCluster}-${ns.name}-${f.value}`}
            title={`${ns.name} / ${f.title}`}
            value={`${selectedCluster}|${ns.name}|${f.value}`}
          />
        ))
      )}
    </List.Dropdown>
  );
}

interface AttributeItemProps {
  attribute: SearchAttribute;
  isSystem: boolean;
  onRefresh: () => void;
}

function AttributeItem({ attribute, isSystem, onRefresh }: AttributeItemProps) {
  const typeColor = TYPE_COLORS[attribute.type] || Color.SecondaryText;
  const typeIcon = TYPE_ICONS[attribute.type] || Icon.Tag;

  // Generate example query
  const exampleQuery = generateExampleQuery(attribute.name, attribute.type);

  return (
    <List.Item
      title={attribute.name}
      icon={{ source: typeIcon, tintColor: typeColor }}
      accessories={
        [
          { tag: { value: attribute.type, color: typeColor } },
          isSystem ? { tag: { value: "System", color: Color.SecondaryText } } : null,
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Attribute Name" content={attribute.name} />
            <Action.CopyToClipboard
              title="Copy Example Query"
              content={exampleQuery}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function generateExampleQuery(name: string, type: string): string {
  switch (type) {
    case "KEYWORD":
      return `${name} = "value"`;
    case "TEXT":
      return `${name} = "search text"`;
    case "INT":
    case "DOUBLE":
      return `${name} > 100`;
    case "BOOL":
      return `${name} = true`;
    case "DATETIME":
      return `${name} > "2024-01-01T00:00:00Z"`;
    case "KEYWORD_LIST":
      return `${name} = "value"`;
    default:
      return `${name} = "value"`;
  }
}
