import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { useState } from "react";

type Target = {
  key: string;
} & (
  | {
      type: "shortcut";
      name: string;
    }
  | {
      type: "system";
      name: null;
    }
);

type Node = {
  id: string;
  name: string;
  note: string | null;
  priority: number;
  data: {
    layoutMode: "bullets" | "todo" | "h1" | "h2" | "h3";
  };
  createdAt: number;
  modifiedAt: number;
  completedAt: number | null;
};

export default function Command() {
  const { isLoading: isLoadingTargets, data: targets } = useFetch(API_URL + "v1/targets", {
    headers: API_HEADERS,
    mapResult(result) {
      return { data: (result as { targets: Target[] }).targets };
    },
    initialData: [],
    failureToastOptions: {
      title: "Failed to fetch targets",
    },
  });
  const [targetId, setTargetId] = useState("None");
  const { isLoading: isLoadingNodes, data: nodes } = useFetch(API_URL + `v1/nodes?parent_id=${targetId}`, {
    headers: API_HEADERS,
    mapResult(result) {
      return { data: (result as { nodes: Node[] }).nodes };
    },
    initialData: [],
    failureToastOptions: {
      title: "Failed to fetch nodes",
    },
  });

  return (
    <List
      isLoading={isLoadingTargets || isLoadingNodes}
      searchBarAccessory={
        <List.Dropdown tooltip="Target" onChange={setTargetId}>
          <List.Dropdown.Item title="None" value="None" />
          {targets
            .filter((target) => target.type === "shortcut")
            .map((target) => (
              <List.Dropdown.Item key={target.key} icon={Icon.BullsEye} title={target.name} value={target.key} />
            ))}
        </List.Dropdown>
      }
    >
      {nodes.map((node) => (
        <List.Item
          key={node.id}
          icon={Icon.Dot}
          title={node.name}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Dot}
                title="View Nodes"
                target={<ViewNodes parentNode={node} navigationTitle={node.name} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const formatNavigationTitle = (title: string) => {
  const parts = title.split("/");
  if (parts.length <= 3) return title;
  const first = parts[0];
  const lastTwo = parts.slice(-2).join(" / ");
  return `${first} / … / ${lastTwo}`;
};
function ViewNodes({ parentNode, navigationTitle }: { parentNode: Node; navigationTitle: string }) {
  const { isLoading, data: nodes } = useFetch(API_URL + `v1/nodes?parent_id=${parentNode.id}`, {
    headers: API_HEADERS,
    mapResult(result) {
      return { data: (result as { nodes: Node[] }).nodes };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading} navigationTitle={formatNavigationTitle(navigationTitle)}>
      {nodes.map((node) => (
        <List.Item
          key={node.id}
          icon={Icon.Dot}
          title={node.name}
          subtitle={node.note ?? ""}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Dot}
                title="View Nodes"
                target={<ViewNodes parentNode={node} navigationTitle={`${navigationTitle} / ${node.name}`} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
