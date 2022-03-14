import { useNavigation, List, Icon, ActionPanel, Action, showToast, Toast, environment } from "@raycast/api";
import { convert } from "html-to-text";
import { resolve } from "path";
import { useState } from "react";
import useSWR from "swr";
import { workflowyFetcher } from "./fetch";
import { WorkflowyNode } from "./types";
import { nodetoText, getMardown } from "./utils";

export function Tree(props: { parentId?: string; isShowingDetails?: boolean }) {
  const { parentId } = props;
  const { data, error, mutate, isValidating } = useSWR("workflowy", workflowyFetcher);
  const [filter, setFilter] = useState<string>();
  const [isShowingDetails, showDetails] = useState(!!props.isShowingDetails);

  const nodes: Record<string, WorkflowyNode[]> = {};

  if (data) {
    if (!parentId) {
      for (const [parentId, childIds] of Object.entries(data.parentToChildren)) {
        const parent = data.nodes[parentId];
        const children = childIds.map((childId) => data.nodes[childId]);
        nodes[nodetoText(parent)] = filter == "active" ? children.filter((node) => !node.cp) : children;
      }
    } else {
      const parent = data.nodes[parentId];
      const children = data.parentToChildren[parentId].map((childId) => data.nodes[childId]);
      nodes[nodetoText(parent)] = filter == "active" ? children.filter((node) => !node.cp) : children;
    }
  }

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.toString(),
    });
  }

  return (
    <List
      isLoading={isValidating}
      isShowingDetail={isShowingDetails}
      searchBarPlaceholder="Filter by name..."
      enableFiltering
      searchBarAccessory={
        <List.Dropdown storeValue defaultValue="active" tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="Hide Completed" value="active" />
          <List.Dropdown.Item title="Show Completed" value="all" />
        </List.Dropdown>
      }
    >
      {Object.entries(nodes).map(([parentName, children]) => (
        <List.Section key={parentName} title={parentName}>
          {children?.map((node) => (
            <Node
              key={node.id}
              node={node}
              original={
                node.metadata?.mirror?.isMirrorRoot ? data?.nodes[node.metadata?.mirror?.originalId] : undefined
              }
              reload={mutate}
              isShowingDetails={isShowingDetails}
              toggleDetails={() => showDetails(!isShowingDetails)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export function Node(props: {
  node: WorkflowyNode;
  original?: WorkflowyNode;
  isShowingDetails?: boolean;
  toggleDetails?: () => void;
  reload: () => void;
}) {
  const { node, original = props.node, reload, isShowingDetails, toggleDetails } = props;
  const link = `https://workflowy.com/#/${node.id}`;
  const navigation = useNavigation();
  return (
    <List.Item
      icon={original.cp ? Icon.Checkmark : Icon.Circle}
      title={nodetoText(original)}
      accessoryIcon={original.ch ? Icon.ArrowRight : undefined}
      subtitle={original.no && !isShowingDetails ? convert(original.no) : undefined}
      detail={<List.Item.Detail markdown={getMardown(original)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={link} />
            <Action.OpenInBrowser
              icon={resolve(environment.assetsPath, "icon.png")}
              title="Open in Desktop App"
              url={`workflowy://${link}`}
            />
            <Action
              icon={Icon.Text}
              title="Toggle Details"
              onAction={toggleDetails}
              shortcut={{ modifiers: ["opt"], key: "enter" }}
            />
            {original.ch ? (
              <Action
                icon={Icon.ArrowRight}
                title="Zoom In"
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => navigation.push(<Tree parentId={original.id} isShowingDetails={isShowingDetails} />)}
              />
            ) : undefined}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={original.nm} />
            {original?.no ? <Action.CopyToClipboard title="Copy Note" content={original.no} /> : undefined}
            <Action.CopyToClipboard title="Copy Node URL" content={link} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.ArrowClockwise}
              title="Reload"
              onAction={reload}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
