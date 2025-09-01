import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

interface NamespaceSelectorProps {
  namespaces: string[];
  currentNamespace?: string;
  onSelect: (namespace: string) => void;
}

export function NamespaceSelector({ namespaces, currentNamespace, onSelect }: NamespaceSelectorProps) {
  const [searchText, setSearchText] = useState("");

  const filteredNamespaces = namespaces.filter((namespace) =>
    namespace.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Search namespaces..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filteredNamespaces.map((namespace) => (
        <List.Item
          key={namespace}
          title={namespace}
          subtitle={namespace === currentNamespace ? "Current namespace" : ""}
          accessories={[
            {
              text: namespace === currentNamespace ? "●" : "",
              tooltip: namespace === currentNamespace ? "Current namespace" : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title={`Select ${namespace}`} onAction={() => onSelect(namespace)} />
            </ActionPanel>
          }
        />
      ))}
      {filteredNamespaces.length === 0 && (
        <List.Item
          title="No Namespaces Found"
          subtitle={searchText ? `No namespaces matching "${searchText}"` : "No namespaces available"}
          accessories={[{ text: "⚠️" }]}
        />
      )}
    </List>
  );
}
