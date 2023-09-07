import { ActionPanel, List, Action, showToast, popToRoot, closeMainWindow, Toast, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { LooseObject, loadDevices, tailscale } from "./shared";

function loadExitNodes(self: LooseObject, data: LooseObject) {
  const devices = loadDevices(self, data);

  return devices.filter((element) => {
    return element.exitnodeoption;
  });
}

function isExitNodeActive(devices: any) {
  for (const device of devices) {
    if (device.exitnode) {
      return true;
    }
  }

  return false;
}

function setExitNode(host: string, allowLAN: boolean) {
  popToRoot();
  closeMainWindow();
  tailscale(`set --exit-node "${host}"`);

  if (allowLAN) {
    tailscale(`set --exit-node-allow-lan-access`);
  }
}

function ExitNodeList() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [exitNodes, setExitNodes] = useState<any>();
  useEffect(() => {
    async function fetch() {
      try {
        const ret = tailscale(`status --json`)!;
        const data: LooseObject = JSON.parse(ret);

        if (!data.Self.Online) {
          throw "Tailscale not connected";
        }

        const _list = loadExitNodes(data.Self, data.Peer);
        setExitNodes(_list);

        if (isExitNodeActive(_list)) {
          setIsActive(true);
        }
      } catch (error) {
        showToast(Toast.Style.Failure, "Couldn't load exitNodes. Make sure Tailscale is connected.");
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={!exitNodes}>
      {isActive && (
        <List.Item
          key="_disable"
          title="Turn off exit node"
          actions={
            <ActionPanel>
              <Action title="Turn off Exit Node" onAction={() => setExitNode("", false)} />
            </ActionPanel>
          }
        />
      )}

      {exitNodes?.map((exitNode: any) => (
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
              text: exitNode.exitnode ? `        Connected` : "",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Use as Exit Node" onAction={() => setExitNode(exitNode.name, false)} />
              <Action title="Use as Exit Node and Allow LAN Access" onAction={() => setExitNode(exitNode.name, true)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return <ExitNodeList />;
}
