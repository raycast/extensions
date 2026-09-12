import { getToken } from "@/utils/preference";
import { Icon, List, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { Response, Node } from "@/types/v2ex";

export const NodeSelect = ({ nodes, onNodeChange }: { nodes: string[]; onNodeChange: (node: string) => void }) => {
  const token = getToken();
  const nodeDetails = nodes.map((node) =>
    useFetch<Response<Node>>(`https://www.v2ex.com/api/v2/nodes/${node}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      execute: false,
      keepPreviousData: true,
    })
  );
  useEffect(() => {
    nodeDetails.forEach((node) => {
      !node.data && node.revalidate();
    });
  }, []);
  return (
    <List.Dropdown
      tooltip="Select Node"
      storeValue={true}
      onChange={(node) => {
        onNodeChange(node);
      }}
    >
      <List.Dropdown.Section title="Node">
        {nodes.map((node, index) => (
          <List.Dropdown.Item
            key={node}
            title={nodeDetails[index].data?.result?.title || node.toUpperCase()}
            value={node}
            icon={nodeDetails[index].data?.result?.avatar || Icon.Dot}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
