import { ActionPanel, List, Action, popToRoot, closeMainWindow, Image, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  StatusResponse,
  getStatus,
  getDevices,
  tailscale,
  sortDevices,
  ErrorDetails,
  getErrorDetails,
  Device,
} from "./shared";

function loadExitNodes(status: StatusResponse) {
  const devices = getDevices(status);
  return devices.filter((element) => {
    return element.exitnodeoption;
  });
}

function isExitNodeActive(devices: Device[]) {
  return devices.some((d) => d.exitnode);
}

function setExitNode(host: string, allowLAN: boolean) {
  popToRoot();
  closeMainWindow();
  tailscale(`set --exit-node "${host}"`);

  if (allowLAN) {
    tailscale(`set --exit-node-allow-lan-access`);
  }
}

export default function ExitNodeList() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<ErrorDetails>();
  const [exitNodes, setExitNodes] = useState<Device[]>([]);
  useEffect(() => {
    async function fetch() {
      try {
        const status = getStatus();
        const _list = loadExitNodes(status);
        setExitNodes(_list);
        sortDevices(_list);
        if (isExitNodeActive(_list)) {
          setIsActive(true);
        }
      } catch (error) {
        setError(getErrorDetails(error, "Couldn’t load exit nodes."));
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={!exitNodes && !error}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
        <>
          {isActive && (
            <List.Item
              key="_disable"
              title="Turn off exit node"
              actions={
                <ActionPanel>
                  <Action title="Turn Off Exit Node" onAction={() => setExitNode("", false)} />
                </ActionPanel>
              }
            />
          )}
          {exitNodes?.map((exitNode) => (
            <List.Item
              title={exitNode.name}
              subtitle={exitNode.ipv4 + "    " + exitNode.os}
              key={exitNode.key}
              icon={
                exitNode.online
                  ? {
                      source: {
                        light: "connected_light.png",
                        dark: "connected_dark.png",
                      },
                      mask: Image.Mask.Circle,
                    }
                  : {
                      source: {
                        light: "lastseen_light.png",
                        dark: "lastseen_dark.png",
                      },
                      mask: Image.Mask.Circle,
                    }
              }
              accessories={[
                {
                  tag: exitNode.exitnode ? `Connected` : "",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Use as Exit Node" onAction={() => setExitNode(exitNode.name, false)} />
                  <Action
                    title="Use as Exit Node and Allow LAN Access"
                    onAction={() => setExitNode(exitNode.name, true)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
