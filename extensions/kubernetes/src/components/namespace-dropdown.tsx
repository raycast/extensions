import { List } from "@raycast/api";
import { useKubernetesNamespace } from "../states/namespace";

export default function NamespaceDropdown() {
  const { namespaces, setCurrentNamespace } = useKubernetesNamespace();

  return (
    <List.Dropdown
      tooltip="Select Namespace"
      storeValue={true}
      onChange={(ns) => {
        setCurrentNamespace(ns);
      }}
    >
      <List.Dropdown.Item title="All Namespaces" key=".all" value="" />
      {namespaces.map((ns) => (
        <List.Dropdown.Item title={ns} key={ns} value={ns} />
      ))}
    </List.Dropdown>
  );
}
