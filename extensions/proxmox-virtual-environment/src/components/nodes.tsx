import { useEffect, useState } from "react";
import { List, Color, Toast, Icon, showToast } from "@raycast/api";
import { ProxmoxAPI } from "../utils/api/proxmox";
import { Node } from "../interfaces/node";
import { secondsToHMS, bytesToGBS } from "../utils/helpers/conversion";

export function ProxmoxNodes(): JSX.Element {
  const [nodes, setNodes] = useState<Node[]>();
  const [error, setError] = useState<Error>();
  const instance = new ProxmoxAPI();
  async function getNodes() {
    let ns;
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching nodes",
      });
      ns = await instance.getNodes();
    } catch (error) {
      setError(new Error("Failed to get nodes", { cause: error }));
    }
    showToast({
      style: Toast.Style.Success,
      title: "Fetched nodes",
    });
    setNodes(ns);
  }
  useEffect(() => {
    getNodes();
  }, []);
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={nodes === undefined && error === undefined}
      isShowingDetail={nodes !== undefined && nodes?.length !== 0}
    >
      {error !== undefined ? (
        <List.EmptyView icon={Icon.Warning} title={error.message} description={`${error.cause}`} />
      ) : (
        <></>
      )}
      {nodes?.length === 0 ? (
        <List.EmptyView title="No Nodes Found" description="Unknown error occurred" icon={Icon.SpeechBubbleImportant} />
      ) : (
        nodes?.map((node: Node) => (
          <List.Item
            icon={{ source: "icons/node.svg", tintColor: Color.PrimaryText }}
            key={node.name}
            title={node.name}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={node.status}
                        color={node.status == "online" ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Uptime" text={secondsToHMS(node.uptime)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="CPU Usage"
                      text={`${Math.ceil(node.cpuUtil * 100)}% of ${node.cpu} CPU(s)`}
                      icon={{ source: "icons/cpu.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Memory Usage"
                      text={`${Math.ceil((node.memUtil / node.mem) * 100)}% (${bytesToGBS(node.memUtil)} / ${bytesToGBS(node.mem)})`}
                      icon={{ source: "icons/memory.svg", tintColor: Color.PrimaryText }}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
